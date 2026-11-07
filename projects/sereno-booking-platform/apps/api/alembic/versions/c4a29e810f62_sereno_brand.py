"""Update the original studio defaults without changing customer data."""

import sqlalchemy as sa

from alembic import op

revision = "c4a29e810f62"
down_revision = "b914db2f17c0"
branch_labels = None
depends_on = None

studio = sa.table("business_settings", sa.column("name", sa.String), sa.column("email", sa.String))


def upgrade():
    op.execute(
        studio.update().where(studio.c.name == "CALENZA Studio").values(name="SERENO Studio")
    )
    op.execute(
        studio.update()
        .where(studio.c.email == "hello@calenza.example")
        .values(email="hello@sereno.example")
    )


def downgrade():
    op.execute(
        studio.update().where(studio.c.name == "SERENO Studio").values(name="CALENZA Studio")
    )
    op.execute(
        studio.update()
        .where(studio.c.email == "hello@sereno.example")
        .values(email="hello@calenza.example")
    )
