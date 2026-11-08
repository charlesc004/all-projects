"""Allow notifications about service assignments without an appointment."""

from alembic import op
import sqlalchemy as sa

revision = "b914db2f17c0"
down_revision = "7ef812a91620"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("notifications", "appointment_id", existing_type=sa.Integer(), nullable=True)


def downgrade():
    op.execute("DELETE FROM notifications WHERE appointment_id IS NULL")
    op.alter_column("notifications", "appointment_id", existing_type=sa.Integer(), nullable=False)
