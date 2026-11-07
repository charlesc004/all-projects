import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.database import Session
from app.main import app
from app.modules.models import Appointment

from .conftest import available, login


async def book(client, start, **extra):
    return await client.post(
        "/api/v1/bookings", json={"service_id": 1, "staff_id": 1, "start_at": start, **extra}
    )


async def test_registration_login_profile_and_role_restrictions(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test Person",
            "email": "test@example.com",
            "password": "SecureExample!123",
            "role": "admin",
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["role"] == "customer"
    assert "password_hash" not in response.json()
    client.headers["X-CSRF-Token"] = client.cookies.get("sereno_csrf")
    assert (await client.get("/api/v1/admin/settings")).status_code == 403
    assert (
        await client.patch(
            "/api/v1/auth/me", json={"full_name": "Updated Name", "phone": "+44 7700 900000"}
        )
    ).json()["full_name"] == "Updated Name"


async def test_booking_persistence_and_cancellation_releases_slot(client):
    await login(client)
    slot = (await available(client))[0]
    response = await book(client, slot)
    assert response.status_code == 201, response.text
    booking = response.json()
    assert slot not in await available(client)
    assert (await client.get(f"/api/v1/bookings/{booking['id']}")).json()["id"] == booking["id"]
    assert (
        await client.post(
            f"/api/v1/bookings/{booking['id']}/cancel", json={"reason": "Changed plans"}
        )
    ).status_code == 200
    assert slot in await available(client)
    history = (await client.get(f"/api/v1/bookings/{booking['id']}/activity")).json()
    assert {h["event"] for h in history} == {"confirmed", "cancelled"}
    assert len((await client.get("/api/v1/notifications")).json()) > 0


async def test_concurrent_customers_exactly_one_booking_succeeds(client):
    await login(client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as second:
        response = await second.post(
            "/api/v1/auth/login",
            json={"email": "customer2@sereno.example", "password": "SerenoDemo!2026"},
        )
        assert response.status_code == 200
        second.headers["X-CSRF-Token"] = second.cookies.get("sereno_csrf")
        slot = (await available(client))[0]
        results = await asyncio.gather(book(client, slot), book(second, slot))
        assert sorted(r.status_code for r in results) == [201, 409]


async def test_database_exclusion_constraint_even_without_availability_query(client):
    await login(client)
    booking = (await book(client, (await available(client))[0])).json()
    async with Session() as db:
        original = await db.get(Appointment, booking["id"])
        values = {
            column.name: getattr(original, column.name)
            for column in Appointment.__table__.columns
            if column.name not in {"id", "created_at", "updated_at"}
        }
        db.add(Appointment(**values))
        with pytest.raises(IntegrityError) as error:
            await db.commit()
        assert error.value.orig.sqlstate == "23P01"


async def test_reschedule_conflict_preserves_original_then_valid_reschedule(client):
    await login(client)
    slots = await available(client)
    first = (await book(client, slots[0])).json()
    other_slots = await available(client)
    second = (await book(client, other_slots[-1])).json()
    response = await client.post(
        f"/api/v1/bookings/{first['id']}/reschedule", json={"start_at": second["start_at"]}
    )
    assert response.status_code == 409
    assert (await client.get(f"/api/v1/bookings/{first['id']}")).json()["start_at"] == first[
        "start_at"
    ]
    new_slot = (await available(client, days_ahead=7))[0]
    assert (
        await client.post(f"/api/v1/bookings/{first['id']}/reschedule", json={"start_at": new_slot})
    ).status_code == 200


async def test_customer_cannot_read_or_change_other_customers_appointment(client):
    await login(client)
    booking = (await book(client, (await available(client))[0])).json()
    await login(client, "staff")
    assert (await client.get(f"/api/v1/bookings/{booking['id']}")).status_code == 200
    assert (await client.get("/api/v1/admin/customers")).status_code == 403
    assert (await client.patch("/api/v1/admin/settings", json={})).status_code == 403
    await client.post("/api/v1/auth/logout")
    client.cookies.clear()
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "customer2@sereno.example", "password": "SerenoDemo!2026"},
    )
    assert response.status_code == 200
    client.headers["X-CSRF-Token"] = client.cookies.get("sereno_csrf")
    assert (await client.get(f"/api/v1/bookings/{booking['id']}")).status_code == 404
    assert (
        await client.post(f"/api/v1/bookings/{booking['id']}/cancel", json={})
    ).status_code == 404


async def test_csrf_and_origin_enforced(client):
    await login(client)
    client.headers.pop("X-CSRF-Token")
    assert (
        await client.patch("/api/v1/auth/me", json={"full_name": "No Change", "phone": ""})
    ).status_code == 403
    client.headers["X-CSRF-Token"] = client.cookies.get("sereno_csrf")
    assert (
        await client.post("/api/v1/auth/logout", headers={"Origin": "https://evil.example"})
    ).status_code == 403


async def test_refresh_rotation_and_logout_revoke_sessions(client):
    await login(client)
    old = client.cookies.get("sereno_refresh")
    assert (await client.post("/api/v1/auth/refresh")).status_code == 200
    assert old != client.cookies.get("sereno_refresh")
    client.headers["X-CSRF-Token"] = client.cookies.get("sereno_csrf")
    access = client.cookies.get("sereno_access")
    await client.post("/api/v1/auth/logout")
    client.cookies.set("sereno_access", access)
    assert (await client.get("/api/v1/auth/me")).status_code == 401


async def test_staff_cannot_view_other_staff_visits_or_open_overrides(client):
    await login(client, "staff")
    mine = (await client.get("/api/v1/staff/me/appointments")).json()["items"]
    assert all(a["staff_id"] == 1 for a in mine)
    assert (await client.get("/api/v1/bookings/3")).status_code == 404
    today = datetime.now(UTC).date().isoformat()
    response = await client.post(
        "/api/v1/staff/me/schedule-exceptions",
        json={
            "date_from": today,
            "date_to": today,
            "kind": "open",
            "start": "10:00",
            "end": "12:00",
        },
    )
    assert response.status_code == 403


async def test_admin_hours_update_availability_and_conflicts_rejected(client):
    await login(client, "admin")
    before = await available(client, days_ahead=40)
    day = datetime.fromisoformat(before[0]).date()
    data = {
        "date_from": day.isoformat(),
        "date_to": day.isoformat(),
        "kind": "closed",
        "reason": "Studio test",
    }
    assert (
        await client.post("/api/v1/admin/staff/1/schedule-exceptions", json=data)
    ).status_code == 201
    assert not await available(client, days_ahead=40)
    existing = (
        await client.get(
            "/api/v1/admin/appointments", params={"status": "confirmed", "staff_id": 1}
        )
    ).json()["items"][0]
    day = datetime.fromisoformat(existing["start_at"]).date().isoformat()
    data.update(date_from=day, date_to=day)
    assert (
        await client.post("/api/v1/admin/staff/1/schedule-exceptions", json=data)
    ).status_code == 409


async def test_invalid_slots_and_naive_dates_are_rejected(client):
    await login(client)
    assert (await book(client, "2026-01-01T09:00:00")).status_code == 422
    assert (await book(client, datetime.now(UTC).isoformat())).status_code == 409
    assert (
        await book(client, (datetime.now(UTC) + timedelta(days=120)).isoformat())
    ).status_code == 409
    assert (
        await client.get(
            "/api/v1/availability",
            params={"service_id": 2, "staff_id": 1, "date": datetime.now(UTC).date().isoformat()},
        )
    ).status_code == 422


async def test_admin_analytics_aggregate_persisted_records(client):
    await login(client, "admin")
    response = await client.get("/api/v1/admin/analytics")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["active_staff"] == 5 and data["active_services"] == 8
    assert all(0 <= s["count"] <= 100 for s in data["utilization"])
    async with Session() as db:
        assert (
            sum(s["count"] for s in data["by_service"])
            == (await db.execute(text("SELECT COUNT(*) FROM appointments"))).scalar()
        )


async def test_password_reset_outbox_and_token_single_use(client):
    response = await client.post(
        "/api/v1/auth/password-reset/request", json={"email": "customer@sereno.example"}
    )
    assert response.status_code == 200
    async with Session() as db:
        body = (
            await db.execute(text("SELECT body FROM email_outbox ORDER BY id DESC LIMIT 1"))
        ).scalar()
    token = body.split("token=")[1].split("\n")[0]
    response = await client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "password": "NewExamplePass!123"},
    )
    assert response.status_code == 200
    assert (
        await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": token, "password": "NewExamplePass!123"},
        )
    ).status_code == 400


async def test_status_transition_requires_finished_confirmed_appointment(client):
    await login(client, "staff")
    future = (
        await client.get("/api/v1/staff/me/appointments", params={"status": "confirmed"})
    ).json()["items"][0]
    assert (
        await client.patch(
            f"/api/v1/staff/me/appointments/{future['id']}/status", json={"status": "completed"}
        )
    ).status_code == 409
    past = (
        await client.get("/api/v1/staff/me/appointments", params={"status": "completed"})
    ).json()["items"][0]
    assert (
        await client.patch(
            f"/api/v1/staff/me/appointments/{past['id']}/status", json={"status": "no_show"}
        )
    ).status_code == 409
