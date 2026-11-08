from fastapi import APIRouter, Query
from sqlalchemy import delete, select

from app.core.dependencies import DB, Admin
from app.core.errors import fail
from app.core.security import hasher
from app.modules.models import Service, Staff, StaffService, User
from app.modules.notifications.service import notify
from app.modules.schemas import (
    Assignment,
    Message,
    ServiceInput,
    ServiceOut,
    StaffCreate,
    StaffInput,
    StaffOut,
)

router = APIRouter(tags=["Services & professionals"])


@router.get("/services", response_model=list[ServiceOut])
async def services(db: DB, search: str = Query("", max_length=100), category: str | None = None):
    query = select(Service).where(Service.active.is_(True), Service.name.ilike(f"%{search}%"))
    if category:
        query = query.where(Service.category == category)
    return (await db.scalars(query.order_by(Service.id).limit(100))).all()


@router.get("/services/{service_id}", response_model=ServiceOut)
async def service_detail(service_id: int, db: DB):
    item = await db.get(Service, service_id)
    if not item or not item.active:
        fail("not_found", "Service not found.", 404)
    return item


async def staff_list(db: DB, query) -> list[StaffOut]:
    rows = list((await db.scalars(query.order_by(Staff.id).limit(100))).all())
    assignments = (
        (
            await db.execute(
                select(StaffService).where(StaffService.staff_id.in_([s.id for s in rows]))
            )
        )
        .scalars()
        .all()
    )
    return [
        StaffOut(
            **{f: getattr(s, f) for f in StaffInput.model_fields},
            id=s.id,
            service_ids=[a.service_id for a in assignments if a.staff_id == s.id],
        )
        for s in rows
    ]


@router.get("/staff", response_model=list[StaffOut])
async def staff(db: DB, service_id: int | None = None):
    query = select(Staff).where(Staff.active.is_(True))
    if service_id:
        query = query.join(StaffService).where(StaffService.service_id == service_id)
    return await staff_list(db, query)


@router.get("/staff/{staff_id:int}", response_model=StaffOut)
async def staff_detail(staff_id: int, db: DB):
    rows = await staff_list(db, select(Staff).where(Staff.id == staff_id, Staff.active.is_(True)))
    if not rows:
        fail("not_found", "Professional not found.", 404)
    return rows[0]


@router.get("/staff/{staff_id:int}/services", response_model=list[ServiceOut])
async def assigned_services(staff_id: int, db: DB):
    return (
        await db.scalars(
            select(Service)
            .join(StaffService)
            .where(StaffService.staff_id == staff_id, Service.active.is_(True))
        )
    ).all()


@router.get("/admin/services", response_model=list[ServiceOut])
async def all_services(db: DB, actor: Admin):
    return (await db.scalars(select(Service).order_by(Service.id))).all()


@router.post("/admin/services", response_model=ServiceOut, status_code=201)
async def create_service(data: ServiceInput, db: DB, actor: Admin):
    if await db.scalar(select(Service.id).where(Service.slug == data.slug)):
        fail("duplicate_slug", "This service slug is already in use.", 409)
    item = Service(**data.model_dump())
    db.add(item)
    await db.flush()
    return item


@router.patch("/admin/services/{service_id}", response_model=ServiceOut)
async def edit_service(service_id: int, data: ServiceInput, db: DB, actor: Admin):
    item = await db.get(Service, service_id)
    if not item:
        fail("not_found", "Service not found.", 404)
    if await db.scalar(
        select(Service.id).where(Service.slug == data.slug, Service.id != service_id)
    ):
        fail("duplicate_slug", "This service slug is already in use.", 409)
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    return item


@router.delete("/admin/services/{service_id}", response_model=Message)
async def deactivate_service(service_id: int, db: DB, actor: Admin):
    item = await db.get(Service, service_id)
    if not item:
        fail("not_found", "Service not found.", 404)
    item.active = False
    return {"message": "Service deactivated. Appointment history is preserved."}


@router.get("/admin/staff", response_model=list[StaffOut])
async def all_staff(db: DB, actor: Admin):
    return await staff_list(db, select(Staff))


@router.post("/admin/staff", response_model=StaffOut, status_code=201)
async def create_staff(data: StaffCreate, db: DB, actor: Admin):
    if await db.scalar(select(User.id).where(User.email == str(data.email).lower())):
        fail("email_unavailable", "Email already in use.", 409)
    user = User(
        full_name=data.display_name,
        email=str(data.email).lower(),
        password_hash=hasher.hash(data.password),
        role="staff",
        active=data.active,
    )
    db.add(user)
    await db.flush()
    item = Staff(user_id=user.id, **data.model_dump(exclude={"email", "password"}))
    db.add(item)
    await db.flush()
    return (await staff_list(db, select(Staff).where(Staff.id == item.id)))[0]


@router.patch("/admin/staff/{staff_id}", response_model=StaffOut)
async def edit_staff(staff_id: int, data: StaffInput, db: DB, actor: Admin):
    item = await db.scalar(select(Staff).where(Staff.id == staff_id).with_for_update())
    if not item:
        fail("not_found", "Professional not found.", 404)
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    user = await db.get(User, item.user_id)
    user.active = data.active
    await db.flush()
    return (await staff_list(db, select(Staff).where(Staff.id == staff_id)))[0]


@router.put("/admin/staff/{staff_id}/services", response_model=Message)
async def assign(staff_id: int, data: Assignment, db: DB, actor: Admin):
    if not await db.scalar(select(Staff).where(Staff.id == staff_id).with_for_update()):
        fail("not_found", "Professional not found.", 404)
    ids = set(data.service_ids)
    previous = set(
        (
            await db.scalars(
                select(StaffService.service_id).where(StaffService.staff_id == staff_id)
            )
        ).all()
    )
    existing = set((await db.scalars(select(Service.id).where(Service.id.in_(ids)))).all())
    if ids != existing:
        fail("invalid_service", "Unknown service assignment.", 422)
    await db.execute(delete(StaffService).where(StaffService.staff_id == staff_id))
    db.add_all(StaffService(staff_id=staff_id, service_id=sid) for sid in ids)
    if previous != ids:
        person = await db.get(Staff, staff_id)
        names = list(
            (
                await db.scalars(
                    select(Service.name).where(Service.id.in_(ids)).order_by(Service.name)
                )
            ).all()
        )
        await notify(
            db,
            person.user_id,
            "Your service assignments changed",
            "Your assigned services: "
            + (", ".join(names) if names else "none currently")
            + ". Review your working hours and assigned services in your workspace.",
        )
    return {"message": "Service assignments updated."}
