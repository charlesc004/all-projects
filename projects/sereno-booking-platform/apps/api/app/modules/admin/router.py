from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.dependencies import DB, Admin, Team, staff_for
from app.core.errors import fail
from app.modules.availability.service import business
from app.modules.bookings import service as bookings
from app.modules.models import Appointment, BusinessSettings, Staff, User
from app.modules.schedules.service import lock_staff, protect_bookings
from app.modules.schemas import (
    Analytics,
    AppointmentPage,
    CustomerOut,
    CustomerPage,
    SettingsInput,
    SettingsOut,
)

router = APIRouter(tags=["Management"])


@router.get("/business", response_model=SettingsOut)
async def public_business(db: DB):
    return await business(db)


@router.get("/admin/settings", response_model=SettingsOut)
async def settings(db: DB, actor: Admin):
    return await business(db)


@router.patch("/admin/settings", response_model=SettingsOut)
async def set_settings(data: SettingsInput, db: DB, actor: Admin):
    item = await db.scalar(
        select(BusinessSettings).where(BusinessSettings.id == 1).with_for_update()
    )
    staff_ids = list((await db.scalars(select(Staff.id).order_by(Staff.id))).all())
    for sid in staff_ids:
        await lock_staff(db, sid)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    for sid in staff_ids:
        await protect_bookings(db, sid)
    return item


@router.get("/admin/appointments", response_model=AppointmentPage)
@router.get("/staff/me/appointments", response_model=AppointmentPage)
@router.get("/staff/me/schedule", response_model=AppointmentPage)
async def appointments(
    db: DB,
    actor: Team,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = Query(None, pattern="^(confirmed|completed|cancelled|no_show)$"),
    staff_id: int | None = None,
    service_id: int | None = None,
    customer_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    config = await business(db)
    zone = ZoneInfo(config.timezone)
    if date_from and date_to and not 0 < (date_to - date_from).days <= 93:
        fail("invalid_range", "Choose a range of 1 to 93 days.", 422)
    return await bookings.listing(
        db,
        actor,
        offset,
        limit,
        status,
        staff_id,
        service_id,
        datetime.combine(date_from, time.min, zone) if date_from else None,
        datetime.combine(date_to, time.min, zone) if date_to else None,
        customer_id,
    )


@router.get("/staff/me/profile", response_model=dict[str, int])
async def staff_profile(db: DB, actor: Team):
    return {"staff_id": (await staff_for(db, actor)).id}


@router.get("/admin/customers", response_model=CustomerPage)
async def customers(
    db: DB,
    actor: Admin,
    search: str = Query("", max_length=100),
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
):
    condition = (
        User.role == "customer",
        (User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")),
    )
    total = await db.scalar(select(func.count(User.id)).where(*condition))
    rows = (
        await db.execute(
            select(User, func.count(Appointment.id))
            .outerjoin(Appointment, Appointment.customer_id == User.id)
            .where(*condition)
            .group_by(User.id)
            .order_by(User.full_name)
            .offset(offset)
            .limit(limit)
        )
    ).all()
    return {
        "items": [
            CustomerOut(
                **{f: getattr(u, f) for f in CustomerOut.model_fields if f != "appointment_count"},
                appointment_count=count,
            )
            for u, count in rows
        ],
        "total": total,
    }


@router.get("/admin/dashboard", response_model=Analytics)
@router.get("/admin/analytics", response_model=Analytics)
async def analytics(db: DB, actor: Admin):
    from app.modules.admin.analytics import get_analytics

    return await get_analytics(db)
