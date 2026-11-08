from fastapi import APIRouter
from sqlalchemy import select

from app.core.dependencies import DB, Actor
from app.core.errors import fail
from app.modules.models import Notification
from app.modules.schemas import Message, NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
async def notifications(db: DB, actor: Actor):
    return (
        await db.scalars(
            select(Notification)
            .where(Notification.recipient_id == actor.id)
            .order_by(Notification.created_at.desc())
            .limit(100)
        )
    ).all()


@router.patch("/{notification_id}/read", response_model=Message)
async def read(notification_id: int, db: DB, actor: Actor):
    item = await db.get(Notification, notification_id)
    if not item or item.recipient_id != actor.id:
        fail("not_found", "Notification not found.", 404)
    item.read = True
    return {"message": "Marked as read."}
