import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url

if "TEST_DATABASE_URL" not in os.environ or not os.environ["TEST_DATABASE_URL"].split("/")[
    -1
].endswith("_test"):
    raise RuntimeError(
        "Integration tests require TEST_DATABASE_URL pointing to a dedicated database ending in _test"
    )
os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

from app.core.database import engine
from app.main import app, attempts
from scripts.seed import seed


@pytest.fixture(autouse=True)
async def fresh_database():
    expected_database = make_url(os.environ["TEST_DATABASE_URL"]).database
    if engine.url.database != expected_database or not expected_database.endswith("_test"):
        raise RuntimeError("Refusing to truncate a database other than the dedicated test database")
    async with engine.begin() as conn:
        # The dedicated test database is the only database this fixture may truncate.
        tables = (
            (
                await conn.execute(
                    text(
                        "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != 'alembic_version'"
                    )
                )
            )
            .scalars()
            .all()
        )
        if tables:
            await conn.execute(
                text(
                    "TRUNCATE "
                    + ",".join('"' + t + '"' for t in tables)
                    + " RESTART IDENTITY CASCADE"
                )
            )
    await seed()
    attempts.clear()
    yield
    await engine.dispose()


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


async def login(client, role="customer"):
    result = await client.post(
        "/api/v1/auth/login",
        json={"email": f"{role}@sereno.example", "password": "SerenoDemo!2026"},
    )
    assert result.status_code == 200, result.text
    client.headers["X-CSRF-Token"] = client.cookies.get("sereno_csrf")
    return result.json()


async def available(client, staff_id=1, service_id=1, days_ahead=5):
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo

    day = datetime.now(ZoneInfo("Europe/London")).date() + timedelta(days=days_ahead)
    if day.weekday() == 6:
        day += timedelta(days=1)
    response = await client.get(
        "/api/v1/availability",
        params={"staff_id": staff_id, "service_id": service_id, "date": day.isoformat()},
    )
    assert response.status_code == 200, response.text
    return response.json()["slots"]
