from datetime import date, datetime, time
from typing import Annotated, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORM):
    id: int
    full_name: str
    email: str
    phone: str
    role: Literal["customer", "staff", "admin"]
    active: bool


Password = Annotated[str, Field(min_length=10, max_length=128)]


class Register(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: Password


class Login(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(max_length=40)


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=128)
    password: Password


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirm(BaseModel):
    token: str = Field(max_length=200)
    password: Password


class Message(BaseModel):
    message: str


class ServiceInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)
    description: str = Field(min_length=10, max_length=4000)
    category: str = Field(min_length=2, max_length=60)
    duration: int = Field(ge=15, le=480)
    price: int = Field(ge=0, le=1000000)
    buffer_before: int = Field(default=0, ge=0, le=120)
    buffer_after: int = Field(default=15, ge=0, le=120)
    active: bool = True


class ServiceOut(ServiceInput, ORM):
    id: int


class StaffInput(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    title: str = Field(min_length=2, max_length=100)
    bio: str = Field(max_length=4000)
    image: str = Field(
        default="", max_length=500, pattern=r"^(|/images/[a-zA-Z0-9._-]+|https://[^\s]+)$"
    )
    active: bool = True


class StaffCreate(StaffInput):
    email: EmailStr
    password: Password


class StaffOut(StaffInput, ORM):
    id: int
    service_ids: list[int] = []


class Assignment(BaseModel):
    service_ids: list[int] = Field(max_length=100)


class HoursInput(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: time
    end: time

    @model_validator(mode="after")
    def interval(self):
        if self.start >= self.end or self.start.tzinfo or self.end.tzinfo:
            raise ValueError("Working intervals need local start < end")
        return self


class HoursOut(HoursInput, ORM):
    id: int
    staff_id: int | None


class ExceptionInput(BaseModel):
    date_from: date
    date_to: date
    kind: Literal["closed", "open"]
    start: time | None = None
    end: time | None = None
    reason: str = Field(default="", max_length=300)

    @model_validator(mode="after")
    def interval(self):
        if self.date_from > self.date_to or (self.date_to - self.date_from).days > 365:
            raise ValueError("Exception range must be between 0 and 365 days")
        if self.start is None and self.end is None and self.kind == "closed":
            return self
        if (
            not self.start
            or not self.end
            or self.start >= self.end
            or self.start.tzinfo
            or self.end.tzinfo
        ):
            raise ValueError("An open or partial exception needs valid local start and end")
        return self


class ExceptionOut(ExceptionInput, ORM):
    id: int
    staff_id: int


class SettingsInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    timezone: str
    email: EmailStr
    phone: str = Field(max_length=40)
    address: str = Field(max_length=300)
    horizon_days: int = Field(ge=1, le=365)
    notice_minutes: int = Field(ge=0, le=10080)
    cancellation_hours: int = Field(ge=0, le=168)
    slot_minutes: int = Field(ge=5, le=120)

    @field_validator("timezone")
    @classmethod
    def timezone_exists(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown IANA timezone") from exc
        return value


class SettingsOut(SettingsInput, ORM):
    id: int


class BookingInput(BaseModel):
    service_id: int
    staff_id: int
    start_at: AwareDatetime
    notes: str = Field(default="", max_length=1000)
    customer_id: int | None = None


class Reschedule(BaseModel):
    start_at: AwareDatetime


class Cancel(BaseModel):
    reason: str = Field(default="", max_length=500)


class StatusInput(BaseModel):
    status: Literal["completed", "no_show"]


class AppointmentOut(ORM):
    id: int
    customer_id: int
    staff_id: int
    service_id: int
    start_at: datetime
    end_at: datetime
    status: Literal["confirmed", "completed", "cancelled", "no_show"]
    duration: int
    price: int
    notes: str
    cancellation_reason: str | None
    customer_name: str
    staff_name: str
    service_name: str


class AppointmentPage(BaseModel):
    items: list[AppointmentOut]
    total: int


class ActivityOut(ORM):
    id: int
    event: str
    detail: dict
    created_at: datetime


class NotificationOut(ORM):
    id: int
    appointment_id: int | None
    title: str
    message: str
    read: bool
    created_at: datetime


class Slots(BaseModel):
    date: date
    timezone: str
    slots: list[datetime]


class DateAvailability(BaseModel):
    date: date
    status: Literal["available", "full", "closed", "outside_window"]


class CustomerOut(UserOut):
    appointment_count: int


class CustomerPage(BaseModel):
    items: list[CustomerOut]
    total: int


class Metric(BaseModel):
    label: str
    count: int


class Analytics(BaseModel):
    today: int
    upcoming: int
    completed: int
    cancelled: int
    active_staff: int
    active_services: int
    estimated_value: int
    completion_rate: float
    daily: list[Metric]
    by_service: list[Metric]
    by_staff: list[Metric]
    cancellations: list[Metric]
    utilization: list[Metric]
