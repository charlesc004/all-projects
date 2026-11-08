"""Enforce snapshot and blocking interval consistency, even for direct database writes."""

from alembic import op

revision = "7ef812a91620"
down_revision = "d9f1c5631bd8"
branch_labels = None
depends_on = None


def upgrade():
    op.create_check_constraint(
        "valid_appointment_snapshot",
        "appointments",
        "duration > 0 AND price >= 0 AND buffer_before >= 0 AND buffer_after >= 0",
    )
    op.create_check_constraint(
        "consistent_blocking_interval",
        "appointments",
        "end_at = start_at + duration * INTERVAL '1 minute' AND blocked_start = start_at - buffer_before * INTERVAL '1 minute' AND blocked_end = end_at + buffer_after * INTERVAL '1 minute'",
    )


def downgrade():
    op.drop_constraint("consistent_blocking_interval", "appointments")
    op.drop_constraint("valid_appointment_snapshot", "appointments")
