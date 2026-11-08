from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import database
from app.core.errors import fail
from app.modules.models import RefreshSession, Staff, User

DB = Annotated[AsyncSession, Depends(database, scope="function")]


async def current_user(request: Request, db: DB) -> User:
    token = request.cookies.get("sereno_access")
    if not token:
        fail("unauthenticated", "Please sign in to continue.", 401)
    try:
        payload = jwt.decode(
            token,
            settings().secret_key,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "sid", "type"]},
        )
        if payload["type"] != "access":
            raise jwt.InvalidTokenError()
        user_id, session_id = int(payload["sub"]), int(payload["sid"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        fail("unauthenticated", "Your session has expired.", 401)
    session = await db.get(RefreshSession, session_id)
    user = await db.get(User, user_id)
    if (
        not user
        or not user.active
        or not session
        or session.user_id != user_id
        or session.revoked_at
        or session.expires_at <= datetime.now(UTC)
    ):
        fail("unauthenticated", "Your session has expired.", 401)
    return user


Actor = Annotated[User, Depends(current_user)]


def roles(*allowed: str):
    async def check(user: Actor) -> User:
        if user.role not in allowed:
            fail("permission_denied", "You do not have permission for this action.", 403)
        return user

    return check


Admin = Annotated[User, Depends(roles("admin"))]
Team = Annotated[User, Depends(roles("admin", "staff"))]


async def staff_for(db: AsyncSession, user: User) -> Staff:
    staff = await db.scalar(select(Staff).where(Staff.user_id == user.id, Staff.active.is_(True)))
    if not staff:
        fail("permission_denied", "No active professional profile.", 403)
    return staff
