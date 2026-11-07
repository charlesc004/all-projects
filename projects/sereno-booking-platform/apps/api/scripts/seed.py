"""Non-destructive, repeatable development fixture. Never runs in production."""

import asyncio
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import settings
from app.core.database import Session, engine
from app.core.security import hasher
from app.modules.bookings.service import set_times
from app.modules.models import (
    Activity,
    Appointment,
    BusinessSettings,
    Notification,
    ScheduleException,
    Service,
    Staff,
    StaffService,
    User,
    WorkingHours,
)

SERVICES = [
    (
        "The Signature Massage",
        "A deeply restorative full-body massage, tailored to your needs. Release tension and find your balance.",
        "Massage",
        60,
        8500,
    ),
    (
        "Radiance Facial",
        "A considered blend of botanical skincare and expert touch for naturally luminous skin.",
        "Skincare",
        60,
        9500,
    ),
    (
        "Deep Tissue Ritual",
        "Focused, therapeutic bodywork to ease persistent tension and support recovery.",
        "Massage",
        90,
        12000,
    ),
    (
        "Mindful Movement",
        "A private guided movement session to build strength, mobility and a quieter mind.",
        "Movement",
        45,
        5500,
    ),
    (
        "Aromatherapy Escape",
        "Warm essential oils and flowing techniques invite a complete sense of calm.",
        "Massage",
        75,
        10500,
    ),
    (
        "Skin Consultation",
        "Understand your skin with a personal assessment and a practical care plan.",
        "Skincare",
        30,
        3500,
    ),
    (
        "Restorative Yoga",
        "A gentle one-to-one practice with supported postures and unhurried breathing.",
        "Movement",
        60,
        6500,
    ),
    (
        "Wellness Consultation",
        "Make room for better habits with a thoughtful, personal wellbeing consultation.",
        "Wellness",
        30,
        4500,
    ),
]
PEOPLE = [
    (
        "Olivia Bennett",
        "Massage & bodywork specialist",
        "An intuitive approach to therapeutic touch, shaped by over eight years of practice.",
        "olivia.svg",
    ),
    (
        "James Parker",
        "Movement & wellness coach",
        "Thoughtful movement and practical guidance for a stronger, more balanced everyday life.",
        "james.svg",
    ),
    (
        "Sofia Chen",
        "Senior skin therapist",
        "Blending botanical care and modern techniques to help your natural radiance shine.",
        "sofia.svg",
    ),
    (
        "Amelia Rose",
        "Holistic therapist",
        "A warm, personal approach to restoring calm through aromatherapy and restorative practice.",
        "amelia.svg",
    ),
    (
        "Daniel Hayes",
        "Therapeutic massage specialist",
        "Expert deep-tissue work and recovery sessions, tailored to how your body feels today.",
        "daniel.svg",
    ),
]


async def seed():
    if settings().environment != "development":
        raise RuntimeError("Demo seeding is limited to development")
    async with Session.begin() as db:
        if await db.scalar(select(BusinessSettings.id)):
            print("Studio already seeded; existing data preserved.")
            return
        config = BusinessSettings()
        db.add(config)
        password_hash = hasher.hash("SerenoDemo!2026")
        admin = User(
            full_name="Alex Morgan",
            email="admin@sereno.example",
            password_hash=password_hash,
            role="admin",
        )
        db.add(admin)
        staff = []
        for index, (name, title, bio, image) in enumerate(PEOPLE):
            user = User(
                full_name=name,
                email="staff@sereno.example" if index == 0 else f"staff{index + 1}@sereno.example",
                password_hash=password_hash,
                role="staff",
            )
            db.add(user)
            await db.flush()
            person = Staff(
                user_id=user.id, display_name=name, title=title, bio=bio, image=f"/images/{image}"
            )
            db.add(person)
            staff.append(person)
        customers = []
        names = [
            "Emma Wilson",
            "Oliver Reed",
            "Mia Thompson",
            "Noah Clarke",
            "Isla Brooks",
            "Leo Mitchell",
            "Ava Collins",
            "Henry Walsh",
            "Freya Adams",
            "Oscar Green",
            "Grace Turner",
            "Archie Bell",
            "Lily Cooper",
            "George Wood",
            "Florence Hill",
            "Arthur King",
            "Ivy Scott",
            "Theo Baker",
            "Poppy Evans",
            "Charlie Moore",
            "Willow Lewis",
            "Alfie Carter",
            "Rosie Wright",
            "Finley Allen",
            "Daisy Young",
        ]
        for index, name in enumerate(names):
            user = User(
                full_name=name,
                email="customer@sereno.example"
                if index == 0
                else f"customer{index + 1}@sereno.example",
                password_hash=password_hash,
                role="customer",
                phone=f"+44 7700 900{index:03}",
            )
            db.add(user)
            customers.append(user)
        services = []
        for name, description, category, duration, price in SERVICES:
            item = Service(
                name=name,
                slug=name.lower().replace(" ", "-"),
                description=description,
                category=category,
                duration=duration,
                price=price,
                buffer_before=0,
                buffer_after=15,
            )
            db.add(item)
            services.append(item)
        await db.flush()
        eligible = [[0, 2, 4], [3, 6, 7], [1, 5, 7], [0, 4, 6, 7], [0, 2, 4]]
        for index, person in enumerate(staff):
            db.add_all(
                StaffService(staff_id=person.id, service_id=services[s].id) for s in eligible[index]
            )
            for weekday in range(6):
                for start, end in [(time(9), time(12, 30)), (time(13, 30), time(18))]:
                    db.add(WorkingHours(staff_id=person.id, weekday=weekday, start=start, end=end))
        for weekday in range(6):
            db.add(WorkingHours(staff_id=None, weekday=weekday, start=time(9), end=time(19)))
        today = datetime.now(ZoneInfo("Europe/London")).date()
        future = today + timedelta(days=21)
        db.add(
            ScheduleException(
                staff_id=staff[0].id,
                date_from=future,
                date_to=future + timedelta(days=2),
                kind="closed",
                reason="Annual leave",
            )
        )
        override = today + timedelta(days=25)
        if override.weekday() == 6:
            override += timedelta(days=1)
        db.add(
            ScheduleException(
                staff_id=staff[1].id,
                date_from=override,
                date_to=override,
                kind="open",
                start=time(10),
                end=time(16),
                reason="Training morning",
            )
        )
        count = 0
        for delta in range(-14, 15):
            day = today + timedelta(days=delta)
            if day.weekday() == 6:
                continue
            for index, person in enumerate(staff):
                for hour in (10, 14):
                    service = services[eligible[index][count % len(eligible[index])]]
                    start = datetime.combine(day, time(hour), ZoneInfo("Europe/London")).astimezone(
                        UTC
                    )
                    is_past = start + timedelta(minutes=service.duration) < datetime.now(UTC)
                    status = (
                        (
                            "cancelled"
                            if count % 11 == 0
                            else "no_show"
                            if count % 13 == 0
                            else "completed"
                        )
                        if is_past
                        else ("cancelled" if count % 17 == 0 else "confirmed")
                    )
                    customer = customers[count % len(customers)]
                    item = Appointment(
                        customer_id=customer.id,
                        staff_id=person.id,
                        service_id=service.id,
                        duration=service.duration,
                        price=service.price,
                        buffer_before=0,
                        buffer_after=15,
                        notes="",
                        status=status,
                    )
                    set_times(item, start)
                    if status == "cancelled":
                        item.cancellation_reason = "Plans changed"
                        item.cancelled_at = start - timedelta(days=1)
                    db.add(item)
                    await db.flush()
                    db.add(
                        Activity(
                            appointment_id=item.id,
                            actor_id=admin.id,
                            event=status,
                            detail={"source": "development_seed"},
                        )
                    )
                    db.add(
                        Notification(
                            recipient_id=customer.id,
                            appointment_id=item.id,
                            title=f"Appointment {status}",
                            message=f"{service.name} with {person.display_name}",
                            read=is_past,
                        )
                    )
                    count += 1
        print(f"Seeded 8 services, 5 professionals, 25 customers and {count} appointments.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
