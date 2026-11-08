from datetime import datetime

from sqlalchemy import select, update

from app.core.database import Session
from app.modules.models import Appointment, BusinessSettings, Service

from .conftest import available, login


async def test_customer_cancellation_cutoff_and_admin_override(client):
    await login(client)
    response = await client.post(
        "/api/v1/bookings",
        json={"staff_id": 1, "service_id": 1, "start_at": (await available(client))[0]},
    )
    item = response.json()
    async with Session.begin() as db:
        config = await db.get(BusinessSettings, 1)
        config.cancellation_hours = 168
    response = await client.post(f"/api/v1/bookings/{item['id']}/cancel", json={})
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "cancellation_deadline_exceeded"
    await login(client, "admin")
    assert (await client.post(f"/api/v1/bookings/{item['id']}/cancel", json={})).status_code == 200


async def test_reschedule_availability_preserves_original_snapshot(client):
    await login(client)
    response = await client.post(
        "/api/v1/bookings",
        json={"staff_id": 1, "service_id": 1, "start_at": (await available(client))[0]},
    )
    item = response.json()
    async with Session.begin() as db:
        await db.execute(
            update(Service)
            .where(Service.id == 1)
            .values(duration=120, buffer_after=30, price=20000)
        )
    original = datetime.fromisoformat(item["start_at"]).date().isoformat()
    slots = (
        await client.get(f"/api/v1/bookings/{item['id']}/availability", params={"date": original})
    ).json()["slots"]
    assert item["start_at"] in slots
    response = await client.post(
        f"/api/v1/bookings/{item['id']}/reschedule", json={"start_at": slots[-1]}
    )
    assert response.status_code == 200
    assert response.json()["duration"] == 60 and response.json()["price"] == 8500


async def test_staff_can_complete_a_finished_confirmed_appointment(client):
    await login(client, "staff")
    async with Session.begin() as db:
        booking = await db.scalar(
            select(Appointment)
            .where(Appointment.staff_id == 1, Appointment.status == "completed")
            .limit(1)
        )
        booking.status = "confirmed"
        booking_id = booking.id
    response = await client.patch(
        f"/api/v1/staff/me/appointments/{booking_id}/status", json={"status": "completed"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


async def test_schedule_hours_cannot_overlap(client):
    await login(client, "admin")
    response = await client.put(
        "/api/v1/admin/staff/1/working-hours",
        json=[
            {"weekday": 0, "start": "09:00", "end": "12:00"},
            {"weekday": 0, "start": "11:00", "end": "13:00"},
        ],
    )
    assert response.status_code == 422


async def test_extreme_date_is_bounded_without_overflow(client):
    response = await client.get(
        "/api/v1/availability/dates",
        params={"staff_id": 1, "service_id": 1, "date_from": "9999-12-31"},
    )
    assert response.status_code == 422
    response = await client.get(
        "/api/v1/availability", params={"staff_id": 1, "service_id": 1, "date": "9999-12-31"}
    )
    assert response.status_code == 200 and not response.json()["slots"]


async def test_login_rate_limit(client):
    for _ in range(10):
        assert (
            await client.post(
                "/api/v1/auth/login", json={"email": "unknown@example.com", "password": "incorrect"}
            )
        ).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/login", json={"email": "unknown@example.com", "password": "incorrect"}
        )
    ).status_code == 429
