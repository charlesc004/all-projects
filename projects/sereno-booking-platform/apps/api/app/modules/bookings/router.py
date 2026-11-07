from datetime import UTC, date, datetime

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.core.dependencies import DB, Actor, Admin, Team
from app.core.errors import fail
from app.modules.availability.service import business, dates_for, slots_for
from app.modules.bookings import service
from app.modules.models import Activity
from app.modules.schemas import (
    ActivityOut,
    AppointmentOut,
    AppointmentPage,
    BookingInput,
    Cancel,
    DateAvailability,
    Reschedule,
    Slots,
    StatusInput,
)

router = APIRouter(tags=["Appointments"])


@router.post("/bookings", response_model=AppointmentOut, status_code=201)
async def create(data: BookingInput, db: DB, actor: Actor):
    return (await service.present(db, [await service.create(db, data, actor)]))[0]


@router.post("/admin/appointments", response_model=AppointmentOut, status_code=201)
async def admin_create(data: BookingInput, db: DB, actor: Admin):
    return (await service.present(db, [await service.create(db, data, actor)]))[0]


@router.get("/bookings/me", response_model=AppointmentPage)
async def mine(
    db: DB, actor: Actor, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)
):
    return await service.listing(db, actor, offset, limit)


@router.get("/bookings/{booking_id}", response_model=AppointmentOut)
async def detail(booking_id: int, db: DB, actor: Actor):
    return (await service.present(db, [await service.owned(db, booking_id, actor)]))[0]


@router.get("/bookings/{booking_id}/availability", response_model=Slots)
async def reschedule_slots(booking_id: int, date: date, db: DB, actor: Actor):
    item = await service.owned(db, booking_id, actor)
    config = await business(db)
    return {
        "date": date,
        "timezone": config.timezone,
        "slots": await slots_for(db, item.service_id, item.staff_id, date, item.id, item),
    }


@router.get("/bookings/{booking_id}/available-dates", response_model=list[DateAvailability])
async def reschedule_dates(
    booking_id: int, date_from: date, db: DB, actor: Actor, days: int = Query(31, ge=1, le=31)
):
    item = await service.owned(db, booking_id, actor)
    return await dates_for(db, item.service_id, item.staff_id, date_from, days, item)


@router.get("/bookings/{booking_id}/activity", response_model=list[ActivityOut])
async def history(booking_id: int, db: DB, actor: Actor):
    await service.owned(db, booking_id, actor)
    return (
        await db.scalars(
            select(Activity)
            .where(Activity.appointment_id == booking_id)
            .order_by(Activity.created_at.desc())
        )
    ).all()


@router.post("/bookings/{booking_id}/reschedule", response_model=AppointmentOut)
async def reschedule(booking_id: int, data: Reschedule, db: DB, actor: Actor):
    item = await service.owned(db, booking_id, actor, lock=True)
    return (await service.present(db, [await service.reschedule(db, item, data.start_at, actor)]))[
        0
    ]


@router.post("/bookings/{booking_id}/cancel", response_model=AppointmentOut)
async def cancel(booking_id: int, data: Cancel, db: DB, actor: Actor):
    item = await service.owned(db, booking_id, actor, lock=True)
    return (await service.present(db, [await service.cancel(db, item, data.reason, actor)]))[0]


@router.patch("/staff/me/appointments/{booking_id}/status", response_model=AppointmentOut)
async def status(booking_id: int, data: StatusInput, db: DB, actor: Team):
    item = await service.owned(db, booking_id, actor, lock=True)
    if item.status != "confirmed" or item.end_at > datetime.now(UTC):
        fail(
            "invalid_status_transition",
            "Only confirmed appointments that have ended can be marked completed or no-show.",
            409,
        )
    item.status = data.status
    await service.record(db, item, actor, data.status)
    return (await service.present(db, [item]))[0]
