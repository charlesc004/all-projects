"""Relational domain schema. Cross-feature foreign keys live together for clarity."""

from datetime import date, datetime, time

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(12), default="customer")
    active: Mapped[bool] = mapped_column(default=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    __table_args__ = (CheckConstraint("role IN ('customer','staff','admin')"),)


class Staff(Base):
    __tablename__ = "staff"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    display_name: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(100))
    bio: Mapped[str] = mapped_column(Text, default="")
    image: Mapped[str] = mapped_column(String(500), default="")
    active: Mapped[bool] = mapped_column(default=True)


class Service(Base):
    __tablename__ = "services"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(60))
    duration: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    buffer_before: Mapped[int] = mapped_column(default=0)
    buffer_after: Mapped[int] = mapped_column(default=15)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    __table_args__ = (
        CheckConstraint("duration > 0 AND price >= 0 AND buffer_before >= 0 AND buffer_after >= 0"),
    )


class StaffService(Base):
    __tablename__ = "staff_services"
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), primary_key=True)


class WorkingHours(Base):
    __tablename__ = "working_hours"
    id: Mapped[int] = mapped_column(primary_key=True)
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)
    start: Mapped[time] = mapped_column(Time)
    end: Mapped[time] = mapped_column(Time)
    __table_args__ = (CheckConstraint('weekday BETWEEN 0 AND 6 AND start < "end"'),)


class ScheduleException(Base):
    __tablename__ = "schedule_exceptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), index=True)
    date_from: Mapped[date] = mapped_column(Date)
    date_to: Mapped[date] = mapped_column(Date)
    kind: Mapped[str] = mapped_column(String(12))
    start: Mapped[time | None] = mapped_column(Time)
    end: Mapped[time | None] = mapped_column(Time)
    reason: Mapped[str] = mapped_column(String(300), default="")
    __table_args__ = (
        CheckConstraint("date_from <= date_to AND kind IN ('closed','open')"),
        CheckConstraint(
            '(start IS NULL AND "end" IS NULL AND kind = \'closed\') OR (start IS NOT NULL AND "end" IS NOT NULL AND start < "end")'
        ),
    )


class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    blocked_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    blocked_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(12), default="confirmed")
    duration: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    buffer_before: Mapped[int] = mapped_column(Integer)
    buffer_after: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(Text, default="")
    cancellation_reason: Mapped[str | None] = mapped_column(String(500))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    __table_args__ = (
        CheckConstraint("status IN ('confirmed','completed','cancelled','no_show')"),
        CheckConstraint(
            "duration > 0 AND price >= 0 AND buffer_before >= 0 AND buffer_after >= 0",
            name="valid_appointment_snapshot",
        ),
        CheckConstraint(
            "end_at = start_at + duration * INTERVAL '1 minute' AND blocked_start = start_at - buffer_before * INTERVAL '1 minute' AND blocked_end = end_at + buffer_after * INTERVAL '1 minute'",
            name="consistent_blocking_interval",
        ),
        CheckConstraint(
            "blocked_start <= start_at AND start_at < end_at AND end_at <= blocked_end"
        ),
        ExcludeConstraint(
            ("staff_id", "="),
            (func.tstzrange(blocked_start, blocked_end, "[)"), "&&"),
            where=text("status = 'confirmed'"),
            using="gist",
            name="no_staff_overlap",
        ),
        Index("ix_appointments_status_start", "status", "start_at"),
    )


class Activity(Base):
    __tablename__ = "appointment_activity"
    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    event: Mapped[str] = mapped_column(String(40))
    detail: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"))
    title: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BusinessSettings(Base):
    __tablename__ = "business_settings"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    name: Mapped[str] = mapped_column(String(100), default="SERENO Studio")
    timezone: Mapped[str] = mapped_column(String(100), default="Europe/London")
    email: Mapped[str] = mapped_column(String(254), default="hello@sereno.example")
    phone: Mapped[str] = mapped_column(String(40), default="+44 20 7946 0382")
    address: Mapped[str] = mapped_column(String(300), default="28 Willow Lane, London")
    horizon_days: Mapped[int] = mapped_column(default=90)
    notice_minutes: Mapped[int] = mapped_column(default=120)
    cancellation_hours: Mapped[int] = mapped_column(default=12)
    slot_minutes: Mapped[int] = mapped_column(default=15)
    __table_args__ = (
        CheckConstraint(
            "id = 1 AND horizon_days BETWEEN 1 AND 365 AND notice_minutes >= 0 AND cancellation_hours >= 0 AND slot_minutes BETWEEN 5 AND 120"
        ),
    )


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PasswordReset(Base):
    __tablename__ = "password_resets"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(default=False)


class EmailOutbox(Base):
    __tablename__ = "email_outbox"
    id: Mapped[int] = mapped_column(primary_key=True)
    recipient: Mapped[str] = mapped_column(String(254))
    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
