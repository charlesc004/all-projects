"""Transactional notification boundary. No delivery is claimed for local outbox messages."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.models import EmailOutbox, Notification, User


async def notify(
    db: AsyncSession, recipient_id: int, title: str, message: str, appointment_id: int | None = None
) -> None:
    recipient = await db.get(User, recipient_id)
    db.add(
        Notification(
            recipient_id=recipient_id, appointment_id=appointment_id, title=title, message=message
        )
    )
    db.add(
        EmailOutbox(
            recipient=recipient.email,
            subject=title,
            body=message + "\nDevelopment outbox only; not delivered.",
        )
    )
