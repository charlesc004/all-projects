import secrets
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from time import monotonic

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import engine
from app.modules.admin.router import router as admin
from app.modules.auth.router import router as auth
from app.modules.availability.router import router as availability
from app.modules.bookings.router import router as bookings
from app.modules.catalog.router import router as catalog
from app.modules.notifications.router import router as notifications
from app.modules.schedules.router import router as schedules


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="SERENO API", version="1.0.0", lifespan=lifespan)


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, error: IntegrityError):
    code = getattr(error.orig, "sqlstate", None)
    errors = {
        "23505": (
            409,
            "already_exists",
            "This value is already in use. Please refresh and try again.",
        ),
        "23503": (409, "invalid_reference", "A referenced record is unavailable."),
        "23514": (422, "invalid_record", "The supplied values violate a data consistency rule."),
        "23P01": (
            409,
            "slot_unavailable",
            "That time has just been booked. Please choose another slot.",
        ),
    }
    status, error_code, message = errors.get(
        code, (500, "database_error", "The operation could not be saved.")
    )
    return JSONResponse({"detail": {"code": error_code, "message": message}}, status_code=status)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings().origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)
attempts: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def security(request: Request, call_next):
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin != settings().origin:
            return JSONResponse(
                {"detail": {"code": "invalid_origin", "message": "Request origin is not allowed."}},
                status_code=403,
            )
        if request.cookies.get("sereno_access") or request.cookies.get("sereno_refresh"):
            cookie, header = (
                request.cookies.get("sereno_csrf", ""),
                request.headers.get("x-csrf-token", ""),
            )
            if not cookie or not secrets.compare_digest(cookie, header):
                return JSONResponse(
                    {
                        "detail": {
                            "code": "csrf_failed",
                            "message": "Refresh this page and try again.",
                        }
                    },
                    status_code=403,
                )
        if request.url.path in {
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/password-reset/request",
            "/api/v1/auth/password-reset/confirm",
        }:
            now = monotonic()
            # Bound memory for a single-worker demo deployment; never trust forwarded IP headers.
            if len(attempts) > 10000:
                for key in list(attempts):
                    if not attempts[key] or attempts[key][-1] < now - 60:
                        del attempts[key]
                if len(attempts) > 10000:
                    return JSONResponse(
                        {
                            "detail": {
                                "code": "rate_limited",
                                "message": "Please try again shortly.",
                            }
                        },
                        status_code=429,
                    )
            key = f"{request.client.host if request.client else 'unknown'}:{request.url.path}"
            hits = attempts[key]
            while hits and hits[0] < now - 60:
                hits.popleft()
            if len(hits) >= 10:
                return JSONResponse(
                    {
                        "detail": {
                            "code": "rate_limited",
                            "message": "Too many attempts. Try again in a minute.",
                        }
                    },
                    status_code=429,
                )
            hits.append(now)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health")
async def health():
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok"}


for router in [auth, availability, bookings, catalog, schedules, admin, notifications]:
    app.include_router(router, prefix="/api/v1")
