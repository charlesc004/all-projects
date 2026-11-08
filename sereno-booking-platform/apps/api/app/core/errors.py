from fastapi import HTTPException


def fail(code: str, message: str, status: int = 400) -> None:
    raise HTTPException(status, {"code": code, "message": message})
