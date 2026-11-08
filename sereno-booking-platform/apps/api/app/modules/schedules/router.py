from fastapi import APIRouter
from sqlalchemy import select

from app.core.dependencies import DB, Admin, Team, staff_for
from app.core.errors import fail
from app.modules.models import ScheduleException, WorkingHours
from app.modules.schedules.service import add_exception, lock_staff, protect_bookings, replace_hours
from app.modules.schemas import ExceptionInput, ExceptionOut, HoursInput, HoursOut, Message

router = APIRouter(tags=["Schedules"])


@router.get("/admin/working-hours", response_model=list[HoursOut])
async def studio_hours(db: DB, actor: Admin):
    return (await db.scalars(select(WorkingHours).where(WorkingHours.staff_id.is_(None)))).all()


@router.put("/admin/working-hours", response_model=Message)
async def set_studio_hours(data: list[HoursInput], db: DB, actor: Admin):
    await replace_hours(db, None, data)
    return {"message": "Studio hours updated."}


@router.get("/admin/staff/{staff_id}/working-hours", response_model=list[HoursOut])
async def hours(staff_id: int, db: DB, actor: Admin):
    return (await db.scalars(select(WorkingHours).where(WorkingHours.staff_id == staff_id))).all()


@router.put("/admin/staff/{staff_id}/working-hours", response_model=Message)
async def set_hours(staff_id: int, data: list[HoursInput], db: DB, actor: Admin):
    await replace_hours(db, staff_id, data)
    return {"message": "Weekly hours updated."}


@router.get("/staff/me/working-hours", response_model=list[HoursOut])
async def my_hours(db: DB, actor: Team):
    staff = await staff_for(db, actor)
    return (await db.scalars(select(WorkingHours).where(WorkingHours.staff_id == staff.id))).all()


@router.get("/admin/staff/{staff_id}/schedule-exceptions", response_model=list[ExceptionOut])
async def exceptions(staff_id: int, db: DB, actor: Admin):
    return (
        await db.scalars(
            select(ScheduleException)
            .where(ScheduleException.staff_id == staff_id)
            .order_by(ScheduleException.date_from.desc())
            .limit(100)
        )
    ).all()


@router.get("/staff/me/schedule-exceptions", response_model=list[ExceptionOut])
async def my_exceptions(db: DB, actor: Team):
    return await exceptions((await staff_for(db, actor)).id, db, actor)


@router.post(
    "/admin/staff/{staff_id}/schedule-exceptions", response_model=ExceptionOut, status_code=201
)
async def create_exception(staff_id: int, data: ExceptionInput, db: DB, actor: Admin):
    return await add_exception(db, staff_id, data)


@router.post("/staff/me/schedule-exceptions", response_model=ExceptionOut, status_code=201)
async def my_exception(data: ExceptionInput, db: DB, actor: Team):
    staff = await staff_for(db, actor)
    if data.kind != "closed":
        fail(
            "permission_denied",
            "Staff can request time off; administrators manage opening overrides.",
            403,
        )
    return await add_exception(db, staff.id, data)


@router.delete("/schedule-exceptions/{exception_id}", response_model=Message)
async def remove_exception(exception_id: int, db: DB, actor: Team):
    item = await db.get(ScheduleException, exception_id)
    if not item or (actor.role == "staff" and item.staff_id != (await staff_for(db, actor)).id):
        fail("not_found", "Exception not found.", 404)
    if actor.role == "staff" and item.kind != "closed":
        fail("permission_denied", "Only administrators can change opening overrides.", 403)
    await lock_staff(db, item.staff_id)
    await db.delete(item)
    await protect_bookings(db, item.staff_id)
    return {"message": "Schedule exception removed."}


@router.patch("/schedule-exceptions/{exception_id}", response_model=ExceptionOut)
async def edit_exception(exception_id: int, data: ExceptionInput, db: DB, actor: Team):
    item = await db.get(ScheduleException, exception_id)
    if not item or (actor.role == "staff" and item.staff_id != (await staff_for(db, actor)).id):
        fail("not_found", "Exception not found.", 404)
    if actor.role == "staff" and (data.kind != "closed" or item.kind != "closed"):
        fail("permission_denied", "Only administrators can change opening overrides.", 403)
    await lock_staff(db, item.staff_id)
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    await protect_bookings(db, item.staff_id)
    return item
