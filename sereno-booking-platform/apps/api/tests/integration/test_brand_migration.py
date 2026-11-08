import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import select, text

from app.core.database import engine
from app.modules.models import User


async def test_studio_brand_migration_preserves_accounts_and_custom_details():
    source = Path(__file__).parents[2] / "alembic/versions/c4a29e810f62_sereno_brand.py"
    spec = importlib.util.spec_from_file_location("studio_brand_migration", source)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    async with engine.begin() as conn:
        accounts = (await conn.execute(select(User.id, User.email, User.password_hash))).all()
        appointments = await conn.scalar(text("SELECT count(*) FROM appointments"))
        await conn.execute(
            text("UPDATE business_settings SET name=:name, email=:email"),
            {"name": "CALENZA Studio", "email": "hello@calenza.example"},
        )

        def apply(connection, operation):
            with Operations.context(MigrationContext.configure(connection)):
                operation()

        await conn.run_sync(apply, migration.upgrade)
        assert (await conn.execute(text("SELECT name, email FROM business_settings"))).one() == (
            "SERENO Studio",
            "hello@sereno.example",
        )
        await conn.run_sync(apply, migration.downgrade)
        assert (await conn.execute(text("SELECT name, email FROM business_settings"))).one() == (
            "CALENZA Studio",
            "hello@calenza.example",
        )

        await conn.execute(
            text("UPDATE business_settings SET name=:name, email=:email"),
            {"name": "Personal studio", "email": "owner@example.com"},
        )
        for operation in [migration.upgrade, migration.downgrade]:
            await conn.run_sync(apply, operation)
            assert (
                await conn.execute(text("SELECT name, email FROM business_settings"))
            ).one() == (
                "Personal studio",
                "owner@example.com",
            )
        assert (
            await conn.execute(select(User.id, User.email, User.password_hash))
        ).all() == accounts
        assert await conn.scalar(text("SELECT count(*) FROM appointments")) == appointments
