from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import fail
from app.modules.availability.slot_generator import Interval, Policy, generate_slots, wall_interval
from app.modules.models import (
    Appointment,
    BusinessSettings,
    ScheduleException,
    Service,
    Staff,
    StaffService,
    WorkingHours,
)


async def business(db: AsyncSession) -> BusinessSettings:
    config = await db.get(BusinessSettings, 1)
    if not config:
        fail("not_initialized", "Run migrations and the development seed first.", 503)
    return config


async def eligible(
    db: AsyncSession, staff_id: int, service_id: int, lock: bool = False
) -> tuple[Staff, Service]:
    query = select(Staff).where(Staff.id == staff_id, Staff.active.is_(True))
    if lock:
        query = query.with_for_update()
    staff = await db.scalar(query)
    service = await db.get(Service, service_id)
    assignment = await db.get(StaffService, (staff_id, service_id))
    if not staff or not service or not service.active or not assignment:
        fail("not_eligible", "This professional is not available for the selected service.", 422)
    return staff, service


def day_intervals(
    day: date, hours: list[WorkingHours], exceptions: list[ScheduleException], timezone: str
) -> tuple[list[Interval], list[Interval]]:
    zone = ZoneInfo(timezone)
    staff_hours = [h for h in hours if h.staff_id is not None and h.weekday == day.weekday()]
    business_hours = [h for h in hours if h.staff_id is None and h.weekday == day.weekday()]
    active_exceptions = [e for e in exceptions if e.date_from <= day <= e.date_to]
    opened = [e for e in active_exceptions if e.kind == "open"]
    staff_intervals = [
        i for h in (opened or staff_hours) for i in wall_interval(day, h.start, h.end, zone)
    ]
    studio_intervals = [i for h in business_hours for i in wall_interval(day, h.start, h.end, zone)]
    # Employee overrides remain within studio opening hours.
    working = [
        (max(a, c), min(b, d))
        for a, b in staff_intervals
        for c, d in studio_intervals
        if max(a, c) < min(b, d)
    ]
    blocked: list[Interval] = []
    for exc in active_exceptions:
        if exc.kind == "closed":
            if exc.start is None:
                working = []
            else:
                blocked.extend(wall_interval(day, exc.start, exc.end, zone))
    return working, blocked


async def load_calendar(
    db: AsyncSession, staff_id: int, first: date, last: date, exclude_id: int | None = None
):
    config = await business(db)
    zone = ZoneInfo(config.timezone)
    lower = datetime.combine(first, time.min, zone).astimezone(UTC)
    upper = datetime.combine(last + timedelta(days=1), time.min, zone).astimezone(UTC)
    hours = list(
        (
            await db.scalars(
                select(WorkingHours).where(
                    (WorkingHours.staff_id == staff_id) | WorkingHours.staff_id.is_(None)
                )
            )
        ).all()
    )
    exceptions = list(
        (
            await db.scalars(
                select(ScheduleException).where(
                    ScheduleException.staff_id == staff_id,
                    ScheduleException.date_from <= last,
                    ScheduleException.date_to >= first,
                )
            )
        ).all()
    )
    query = select(Appointment).where(
        Appointment.staff_id == staff_id,
        Appointment.status == "confirmed",
        Appointment.blocked_start < upper,
        Appointment.blocked_end > lower,
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)
    appointments = list((await db.scalars(query)).all())
    return config, hours, exceptions, appointments


async def slots_for(
    db: AsyncSession,
    service_id: int,
    staff_id: int,
    day: date,
    exclude_id: int | None = None,
    snapshot: Appointment | None = None,
) -> list[datetime]:
    _, service = await eligible(db, staff_id, service_id)
    config = await business(db)
    today = datetime.now(ZoneInfo(config.timezone)).date()
    if not today <= day <= today + timedelta(days=config.horizon_days):
        return []
    config, hours, exceptions, appointments = await load_calendar(
        db, staff_id, day, day, exclude_id
    )
    working, blocked = day_intervals(day, hours, exceptions, config.timezone)
    blocked += [(a.blocked_start, a.blocked_end) for a in appointments]
    item = snapshot or service
    return generate_slots(
        day,
        working,
        blocked,
        item.duration,
        item.buffer_before,
        item.buffer_after,
        Policy(config.timezone, config.slot_minutes, config.notice_minutes, config.horizon_days),
        datetime.now(UTC),
    )


async def dates_for(
    db: AsyncSession,
    service_id: int,
    staff_id: int,
    date_from: date,
    days: int,
    snapshot: Appointment | None = None,
):
    _, service = await eligible(db, staff_id, service_id)
    config = await business(db)
    today = datetime.now(ZoneInfo(config.timezone)).date()
    if abs((date_from - today).days) > 366:
        fail("invalid_range", "Date must be within one year.", 422)
    config, hours, exceptions, appointments = await load_calendar(
        db,
        staff_id,
        date_from,
        date_from + timedelta(days=days - 1),
        snapshot.id if snapshot else None,
    )
    now = datetime.now(UTC)
    today = now.astimezone(ZoneInfo(config.timezone)).date()
    service = snapshot or service
    policy = Policy(
        config.timezone, config.slot_minutes, config.notice_minutes, config.horizon_days
    )
    result = []
    for offset in range(days):
        day = date_from + timedelta(days=offset)
        working, blocked = day_intervals(day, hours, exceptions, config.timezone)
        blocked += [(a.blocked_start, a.blocked_end) for a in appointments]
        slots = generate_slots(
            day,
            working,
            blocked,
            service.duration,
            service.buffer_before,
            service.buffer_after,
            policy,
            now,
        )
        status = "available" if slots else "full" if working else "closed"
        if not today <= day <= today + timedelta(days=config.horizon_days):
            status = "outside_window"
        result.append({"date": day, "status": status})
    return result
