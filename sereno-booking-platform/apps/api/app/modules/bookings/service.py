from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import fail
from app.modules.availability.service import business, eligible, slots_for
from app.modules.models import (
    Activity,
    Appointment,
    Service,
    Staff,
    User,
)
from app.modules.notifications.service import notify
from app.modules.schemas import AppointmentOut, BookingInput


async def owned(db: AsyncSession, booking_id: int, actor: User, lock: bool = False) -> Appointment:
    query = select(Appointment).where(Appointment.id == booking_id)
    if lock:
        query = query.with_for_update()
    item = await db.scalar(query)
    if not item:
        fail("not_found", "Appointment not found.", 404)
    if actor.role == "customer" and item.customer_id != actor.id:
        fail("not_found", "Appointment not found.", 404)
    if actor.role == "staff":
        staff = await db.get(Staff, item.staff_id)
        if staff.user_id != actor.id:
            fail("not_found", "Appointment not found.", 404)
    return item


async def persist(db: AsyncSession) -> None:
    try:
        await db.flush()
    except IntegrityError as exc:
        if getattr(exc.orig, "sqlstate", None) == "23P01":
            fail(
                "slot_unavailable",
                "That time has just been booked. Please choose another slot.",
                409,
            )
        raise


async def record(
    db: AsyncSession, item: Appointment, actor: User, event: str, detail: dict | None = None
) -> None:
    db.add(Activity(appointment_id=item.id, actor_id=actor.id, event=event, detail=detail or {}))
    staff = await db.get(Staff, item.staff_id)
    service = await db.get(Service, item.service_id)
    config = await business(db)
    title = f"Appointment {event.replace('_', ' ')}"
    message = f"{service.name} with {staff.display_name} · {item.start_at.astimezone(ZoneInfo(config.timezone)).strftime('%d %b %Y at %H:%M %Z')}"
    # Transactional outbox: both notifications and emails are visible only after commit.
    for recipient in {item.customer_id, staff.user_id}:
        await notify(db, recipient, title, message, item.id)


def set_times(item: Appointment, start: datetime) -> None:
    item.start_at = start.astimezone(UTC)
    item.end_at = item.start_at + timedelta(minutes=item.duration)
    item.blocked_start = item.start_at - timedelta(minutes=item.buffer_before)
    item.blocked_end = item.end_at + timedelta(minutes=item.buffer_after)


async def create(db: AsyncSession, data: BookingInput, actor: User) -> Appointment:
    if actor.role == "staff":
        fail("permission_denied", "Only customers and administrators can create appointments.", 403)
    customer_id = data.customer_id if actor.role == "admin" and data.customer_id else actor.id
    if actor.role != "admin" and data.customer_id not in (None, actor.id):
        fail("permission_denied", "You can only book for yourself.", 403)
    customer = await db.get(User, customer_id)
    if not customer or customer.role != "customer" or not customer.active:
        fail("invalid_customer", "Choose an active customer.", 422)
    _, service = await eligible(db, data.staff_id, data.service_id, lock=True)
    config = await business(db)
    day = data.start_at.astimezone(ZoneInfo(config.timezone)).date()
    if data.start_at not in await slots_for(db, data.service_id, data.staff_id, day):
        fail(
            "slot_unavailable",
            "This time is no longer available or is outside the booking policy.",
            409,
        )
    item = Appointment(
        customer_id=customer_id,
        staff_id=data.staff_id,
        service_id=data.service_id,
        duration=service.duration,
        price=service.price,
        buffer_before=service.buffer_before,
        buffer_after=service.buffer_after,
        notes=data.notes,
        status="confirmed",
    )
    set_times(item, data.start_at)
    db.add(item)
    await persist(db)
    await record(db, item, actor, "confirmed")
    return item


async def policy_change(db: AsyncSession, item: Appointment, actor: User) -> None:
    if item.status != "confirmed":
        fail("invalid_status_transition", "Only confirmed appointments can be changed.", 409)
    config = await business(db)
    if actor.role == "staff":
        fail("permission_denied", "Please ask an administrator to change this appointment.", 403)
    if item.start_at <= datetime.now(UTC):
        fail("appointment_started", "Appointments that have started cannot be changed.", 409)
    if actor.role == "customer" and item.start_at - datetime.now(UTC) < timedelta(
        hours=config.cancellation_hours
    ):
        fail(
            "cancellation_deadline_exceeded",
            f"Changes require at least {config.cancellation_hours} hours' notice.",
            409,
        )


async def reschedule(
    db: AsyncSession, item: Appointment, start: datetime, actor: User
) -> Appointment:
    await policy_change(db, item, actor)
    await eligible(db, item.staff_id, item.service_id, lock=True)
    config = await business(db)
    if start not in await slots_for(
        db,
        item.service_id,
        item.staff_id,
        start.astimezone(ZoneInfo(config.timezone)).date(),
        item.id,
        item,
    ):
        fail(
            "slot_unavailable",
            "The new time is unavailable. Your original booking is unchanged.",
            409,
        )
    previous = item.start_at.isoformat()
    set_times(item, start)
    await persist(db)
    await record(
        db, item, actor, "rescheduled", {"previous_start": previous, "new_start": start.isoformat()}
    )
    return item


async def cancel(db: AsyncSession, item: Appointment, reason: str, actor: User) -> Appointment:
    await policy_change(db, item, actor)
    item.status, item.cancellation_reason, item.cancelled_at = (
        "cancelled",
        reason,
        datetime.now(UTC),
    )
    await record(db, item, actor, "cancelled", {"reason": reason})
    return item


async def present(db: AsyncSession, items: list[Appointment]) -> list[AppointmentOut]:
    if not items:
        return []
    users = {
        u.id: u.full_name
        for u in (
            await db.scalars(select(User).where(User.id.in_({a.customer_id for a in items})))
        ).all()
    }
    staff = {
        s.id: s.display_name
        for s in (
            await db.scalars(select(Staff).where(Staff.id.in_({a.staff_id for a in items})))
        ).all()
    }
    services = {
        s.id: s.name
        for s in (
            await db.scalars(select(Service).where(Service.id.in_({a.service_id for a in items})))
        ).all()
    }
    return [
        AppointmentOut(
            **{
                field: getattr(a, field)
                for field in AppointmentOut.model_fields
                if field not in {"customer_name", "staff_name", "service_name"}
            },
            customer_name=users[a.customer_id],
            staff_name=staff[a.staff_id],
            service_name=services[a.service_id],
        )
        for a in items
    ]


async def listing(
    db: AsyncSession,
    actor: User,
    offset: int,
    limit: int,
    status: str | None = None,
    staff_id: int | None = None,
    service_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    customer_id: int | None = None,
):
    query = select(Appointment)
    if actor.role == "customer":
        query = query.where(Appointment.customer_id == actor.id)
    elif actor.role == "staff":
        query = query.join(Staff).where(Staff.user_id == actor.id)
    if status:
        query = query.where(Appointment.status == status)
    if staff_id:
        query = query.where(Appointment.staff_id == staff_id)
    if service_id:
        query = query.where(Appointment.service_id == service_id)
    if customer_id and actor.role == "admin":
        query = query.where(Appointment.customer_id == customer_id)
    if date_from:
        query = query.where(Appointment.start_at >= date_from)
    if date_to:
        query = query.where(Appointment.start_at < date_to)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    items = list(
        (
            await db.scalars(
                query.order_by(Appointment.start_at.desc()).offset(offset).limit(limit)
            )
        ).all()
    )
    return {"items": await present(db, items), "total": total}
