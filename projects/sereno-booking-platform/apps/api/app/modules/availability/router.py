from datetime import date

from fastapi import APIRouter, Query

from app.core.dependencies import DB
from app.modules.availability.service import (
    business,
    dates_for,
    slots_for,
)
from app.modules.schemas import DateAvailability, Slots

router = APIRouter(tags=["Availability"])


@router.get("/staff/{staff_id:int}/availability", response_model=Slots)
async def staff_availability(staff_id: int, db: DB, service_id: int, date: date):
    return await availability(db, service_id, staff_id, date)


@router.get("/availability", response_model=Slots)
async def availability(db: DB, service_id: int, staff_id: int, date: date):
    config = await business(db)
    return {
        "date": date,
        "timezone": config.timezone,
        "slots": await slots_for(db, service_id, staff_id, date),
    }


@router.get("/availability/dates", response_model=list[DateAvailability])
async def dates(
    db: DB, service_id: int, staff_id: int, date_from: date, days: int = Query(31, ge=1, le=31)
):
    return await dates_for(db, service_id, staff_id, date_from, days)
