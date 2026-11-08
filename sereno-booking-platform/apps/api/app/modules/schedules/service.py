from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import fail
from app.modules.availability.service import day_intervals, load_calendar
from app.modules.availability.slot_generator import contains, overlaps
from app.modules.models import Appointment, ScheduleException, Staff, WorkingHours
from app.modules.schemas import ExceptionInput, HoursInput


async def lock_staff(db: AsyncSession, staff_id: int) -> None:
    if not await db.scalar(select(Staff).where(Staff.id == staff_id).with_for_update()):
        fail("not_found", "Professional not found.", 404)


async def protect_bookings(db: AsyncSession, staff_id: int) -> None:
    await db.flush()
    appointments = list(
        (
            await db.scalars(
                select(Appointment).where(
                    Appointment.staff_id == staff_id,
                    Appointment.status == "confirmed",
                    Appointment.end_at > datetime.now(UTC),
                )
            )
        ).all()
    )
    if not appointments:
        return
    from app.modules.availability.service import business

    config = await business(db)
    zone = ZoneInfo(config.timezone)
    days = [a.start_at.astimezone(zone).date() for a in appointments]
    _, hours, exceptions, _ = await load_calendar(db, staff_id, min(days), max(days))
    for item, day in zip(appointments, days):
        working, blocked = day_intervals(day, hours, exceptions, config.timezone)
        block = item.blocked_start, item.blocked_end
        if not contains(working, block) or any(overlaps(block, b) for b in blocked):
            fail(
                "schedule_conflict",
                f"This change conflicts with appointment #{item.id}. Reschedule or cancel it first.",
                409,
            )


async def replace_hours(db: AsyncSession, staff_id: int | None, data: list[HoursInput]):
    if len(data) > 28:
        fail("invalid_hours", "At most 28 working intervals are allowed.", 422)
    for index, interval in enumerate(data):
        if any(
            interval.weekday == other.weekday
            and interval.start < other.end
            and other.start < interval.end
            for other in data[index + 1 :]
        ):
            fail("invalid_hours", "Working intervals must not overlap.", 422)
    ids = (
        [staff_id]
        if staff_id
        else list((await db.scalars(select(Staff.id).order_by(Staff.id))).all())
    )
    for sid in ids:
        await lock_staff(db, sid)
    await db.execute(delete(WorkingHours).where(WorkingHours.staff_id == staff_id))
    db.add_all(WorkingHours(staff_id=staff_id, **item.model_dump()) for item in data)
    for sid in ids:
        await protect_bookings(db, sid)


async def add_exception(db: AsyncSession, staff_id: int, data: ExceptionInput):
    await lock_staff(db, staff_id)
    item = ScheduleException(staff_id=staff_id, **data.model_dump())
    db.add(item)
    await protect_bookings(db, staff_id)
    await db.flush()
    return item
