import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.core.database import Session, engine
from app.modules.models import EmailOutbox


async def export():
    folder = Path(settings().outbox_dir)
    folder.mkdir(parents=True, exist_ok=True)
    async with Session() as db:
        for message in (await db.scalars(select(EmailOutbox).order_by(EmailOutbox.id))).all():
            (folder / f"{message.id:06}.json").write_text(
                json.dumps(
                    {
                        "recipient": message.recipient,
                        "subject": message.subject,
                        "body": message.body,
                        "created_at": message.created_at.isoformat(),
                        "delivered": False,
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
    await engine.dispose()
    print(f"Development outbox exported to {folder.resolve()}. No email was delivered.")


asyncio.run(export())
