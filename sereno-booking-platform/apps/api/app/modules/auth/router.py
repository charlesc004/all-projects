import asyncio
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Request, Response
from sqlalchemy import select, update

from app.core.config import settings
from app.core.dependencies import DB, Actor
from app.core.errors import fail
from app.core.security import access_token, digest, hasher, random_token, verify
from app.modules.models import EmailOutbox, PasswordReset, RefreshSession, User
from app.modules.schemas import (
    Login,
    Message,
    PasswordChange,
    ProfileUpdate,
    Register,
    ResetConfirm,
    ResetRequest,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
# Equal-cost negative lookup to reduce account enumeration through login timing.
dummy_hash = hasher.hash(random_token())


async def set_session(db: DB, response: Response, user: User) -> None:
    refresh, csrf = random_token(), random_token()
    session = RefreshSession(
        user_id=user.id,
        token_hash=digest(refresh),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(session)
    await db.flush()
    for name, token, age, http_only, path in [
        ("sereno_access", access_token(user.id, session.id), 900, True, "/"),
        ("sereno_refresh", refresh, 604800, True, "/api/v1/auth"),
        ("sereno_csrf", csrf, 604800, False, "/"),
    ]:
        response.set_cookie(
            name,
            token,
            max_age=age,
            httponly=http_only,
            secure=settings().cookie_secure,
            samesite="lax",
            path=path,
        )


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: Register, db: DB, response: Response):
    if await db.scalar(select(User.id).where(User.email == str(data.email).lower())):
        fail("email_unavailable", "This email cannot be registered.", 409)
    user = User(
        full_name=data.full_name.strip(),
        email=str(data.email).lower(),
        password_hash=await asyncio.to_thread(hasher.hash, data.password),
        role="customer",
    )
    db.add(user)
    await db.flush()
    await set_session(db, response, user)
    return user


@router.post("/login", response_model=UserOut)
async def login(data: Login, db: DB, response: Response):
    user = await db.scalar(select(User).where(User.email == str(data.email).lower()))
    valid = await asyncio.to_thread(
        verify, data.password, user.password_hash if user else dummy_hash
    )
    if not user or not valid or not user.active:
        fail("invalid_credentials", "Email or password is incorrect.", 401)
    await set_session(db, response, user)
    return user


@router.post("/refresh", response_model=UserOut)
async def refresh(request: Request, response: Response, db: DB):
    session = await db.scalar(
        select(RefreshSession)
        .where(RefreshSession.token_hash == digest(request.cookies.get("sereno_refresh", "")))
        .with_for_update()
    )
    if not session or session.revoked_at or session.expires_at <= datetime.now(UTC):
        fail("unauthenticated", "Please sign in again.", 401)
    user = await db.get(User, session.user_id)
    if not user or not user.active:
        fail("unauthenticated", "Please sign in again.", 401)
    session.revoked_at = datetime.now(UTC)
    await set_session(db, response, user)
    return user


@router.post("/logout", response_model=Message)
async def logout(request: Request, response: Response, db: DB):
    await db.execute(
        update(RefreshSession)
        .where(RefreshSession.token_hash == digest(request.cookies.get("sereno_refresh", "")))
        .values(revoked_at=datetime.now(UTC))
    )
    response.delete_cookie("sereno_access", path="/")
    response.delete_cookie("sereno_refresh", path="/api/v1/auth")
    response.delete_cookie("sereno_csrf", path="/")
    return {"message": "Signed out."}


@router.get("/me", response_model=UserOut)
async def me(user: Actor):
    return user


@router.patch("/me", response_model=UserOut)
async def profile(data: ProfileUpdate, user: Actor):
    user.full_name = data.full_name.strip()
    user.phone = data.phone
    return user


@router.post("/password-change", response_model=Message)
async def password_change(data: PasswordChange, user: Actor, db: DB):
    if not await asyncio.to_thread(verify, data.current_password, user.password_hash):
        fail("invalid_credentials", "Current password is incorrect.")
    user.password_hash = await asyncio.to_thread(hasher.hash, data.password)
    await db.execute(
        update(RefreshSession)
        .where(RefreshSession.user_id == user.id)
        .values(revoked_at=datetime.now(UTC))
    )
    return {"message": "Password changed. Please sign in again."}


@router.post("/password-reset/request", response_model=Message)
async def request_reset(data: ResetRequest, db: DB):
    user = await db.scalar(
        select(User).where(User.email == str(data.email).lower(), User.active.is_(True))
    )
    if user:
        token = random_token()
        db.add(
            PasswordReset(
                user_id=user.id,
                token_hash=digest(token),
                expires_at=datetime.now(UTC) + timedelta(minutes=30),
            )
        )
        db.add(
            EmailOutbox(
                recipient=user.email,
                subject="Reset your SERENO password",
                body=f"{settings().origin}/reset-password?token={token}\nThis link expires in 30 minutes. This is a development outbox message, not a delivered email.",
            )
        )
    return {
        "message": "If an account exists, a reset link is available in the development email outbox."
    }


@router.post("/password-reset/confirm", response_model=Message)
async def confirm_reset(data: ResetConfirm, db: DB):
    reset = await db.scalar(
        select(PasswordReset)
        .where(PasswordReset.token_hash == digest(data.token))
        .with_for_update()
    )
    if not reset or reset.used or reset.expires_at <= datetime.now(UTC):
        fail("invalid_token", "This reset link is invalid or expired.")
    user = await db.get(User, reset.user_id)
    user.password_hash = await asyncio.to_thread(hasher.hash, data.password)
    reset.used = True
    await db.execute(
        update(PasswordReset).where(PasswordReset.user_id == user.id).values(used=True)
    )
    await db.execute(
        update(RefreshSession)
        .where(RefreshSession.user_id == user.id)
        .values(revoked_at=datetime.now(UTC))
    )
    return {"message": "Password reset. You can now sign in."}
