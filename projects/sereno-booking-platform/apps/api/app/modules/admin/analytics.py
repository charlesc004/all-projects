from datetime import UTC, datetime, timedelta
from itertools import pairwise
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.availability.service import business
from app.modules.models import Appointment, Service, Staff


async def get_analytics(db: AsyncSession):
    config = await business(db)
    now = datetime.now(UTC)
    today = now.astimezone(ZoneInfo(config.timezone)).date()
    local_day = func.date(func.timezone(config.timezone, Appointment.start_at))
    counts = dict(
        (
            await db.execute(select(Appointment.status, func.count()).group_by(Appointment.status))
        ).all()
    )

    async def group(column, query):
        return [
            {"label": str(label), "count": count}
            for label, count in (await db.execute(query.group_by(column).order_by(column))).all()
        ]

    daily = await group(
        local_day,
        select(local_day, func.count()).where(
            local_day >= today - timedelta(days=13), local_day <= today
        ),
    )
    cancellations = await group(
        local_day,
        select(local_day, func.count()).where(
            Appointment.status == "cancelled",
            local_day >= today - timedelta(days=13),
            local_day <= today,
        ),
    )
    by_service = await group(
        Service.name,
        select(Service.name, func.count()).join(Appointment, Appointment.service_id == Service.id),
    )
    by_staff = await group(
        Staff.display_name,
        select(Staff.display_name, func.count()).join(
            Appointment, Appointment.staff_id == Staff.id
        ),
    )
    # Utilization is elapsed blocked minutes / effective scheduled minutes over the next 7 local days.
    from app.modules.availability.service import day_intervals, load_calendar
    from app.modules.availability.slot_generator import overlaps

    utilization = []
    for staff in (await db.scalars(select(Staff).where(Staff.active.is_(True)))).all():
        _, hours, exceptions, active = await load_calendar(
            db, staff.id, today, today + timedelta(days=6)
        )
        capacity = occupied = 0.0
        for offset in range(7):
            working, closed = day_intervals(
                today + timedelta(days=offset), hours, exceptions, config.timezone
            )
            # Merge intervals before measuring; closures are unioned by splitting all boundaries.
            edges = sorted({t for interval in working + closed for t in interval})
            effective = [
                (a, b)
                for a, b in pairwise(edges)
                if any(s <= a and b <= e for s, e in working)
                and not any(overlaps((a, b), c) for c in closed)
            ]
            capacity += sum((b - a).total_seconds() for a, b in effective)
            occupied += sum(
                max(0, (min(b, ap.blocked_end) - max(a, ap.blocked_start)).total_seconds())
                for a, b in effective
                for ap in active
            )
        utilization.append(
            {
                "label": staff.display_name,
                "count": round(100 * occupied / capacity) if capacity else 0,
            }
        )
    completed, no_show = counts.get("completed", 0), counts.get("no_show", 0)
    return {
        "today": await db.scalar(
            select(func.count()).select_from(Appointment).where(local_day == today)
        ),
        "upcoming": await db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.status == "confirmed", Appointment.start_at > now)
        ),
        "completed": completed,
        "cancelled": counts.get("cancelled", 0),
        "active_staff": await db.scalar(
            select(func.count()).select_from(Staff).where(Staff.active.is_(True))
        ),
        "active_services": await db.scalar(
            select(func.count()).select_from(Service).where(Service.active.is_(True))
        ),
        "estimated_value": await db.scalar(
            select(func.coalesce(func.sum(Appointment.price), 0)).where(
                Appointment.status.in_(["confirmed", "completed"])
            )
        ),
        "completion_rate": round(100 * completed / (completed + no_show), 1)
        if completed + no_show
        else 0,
        "daily": daily,
        "by_service": by_service,
        "by_staff": by_staff,
        "cancellations": cancellations,
        "utilization": utilization,
    }
