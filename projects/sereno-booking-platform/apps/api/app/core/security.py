import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import settings

hasher = PasswordHasher()


def verify(password: str, hashed: str) -> bool:
    try:
        return hasher.verify(hashed, password)
    except (VerificationError, InvalidHashError):
        return False


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def random_token() -> str:
    return secrets.token_urlsafe(48)


def access_token(user_id: int, session_id: int) -> str:
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": session_id,
            "exp": datetime.now(UTC) + timedelta(minutes=15),
            "type": "access",
        },
        settings().secret_key,
        algorithm="HS256",
    )
