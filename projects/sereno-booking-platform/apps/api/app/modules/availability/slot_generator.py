"""Pure UTC interval arithmetic with explicit IANA wall-clock resolution."""

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

Interval = tuple[datetime, datetime]


@dataclass(frozen=True)
class Policy:
    timezone: str
    slot_minutes: int = 15
    notice_minutes: int = 120
    horizon_days: int = 90


def local_instants(day: date, value: time, zone: ZoneInfo) -> list[datetime]:
    """Skip nonexistent times; return both instants for ambiguous wall times."""
    wall = datetime.combine(day, value)
    candidates = {wall.replace(tzinfo=zone, fold=fold).astimezone(UTC) for fold in (0, 1)}
    return sorted(
        instant for instant in candidates if instant.astimezone(zone).replace(tzinfo=None) == wall
    )


def wall_interval(day: date, start: time, end: time, zone: ZoneInfo) -> list[Interval]:
    starts, ends = local_instants(day, start, zone), local_instants(day, end, zone)
    # Invalid DST boundary means this interval cannot safely be offered.
    return [(min(starts), max(ends))] if starts and ends else []


def overlaps(a: Interval, b: Interval) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def contains(intervals: list[Interval], block: Interval) -> bool:
    return any(start <= block[0] and block[1] <= end for start, end in intervals)


def generate_slots(
    day: date,
    working: list[Interval],
    blocked: list[Interval],
    duration: int,
    before: int,
    after: int,
    policy: Policy,
    now: datetime,
) -> list[datetime]:
    if now.tzinfo is None:
        raise ValueError("now must be timezone aware")
    zone = ZoneInfo(policy.timezone)
    today = now.astimezone(zone).date()
    if not today <= day <= today + timedelta(days=policy.horizon_days):
        return []
    slots: list[datetime] = []
    # The grid is defined in local wall time; appointment durations are elapsed minutes.
    for minute in range(0, 24 * 60, policy.slot_minutes):
        for start in local_instants(day, time(minute // 60, minute % 60), zone):
            if start < now + timedelta(minutes=policy.notice_minutes):
                continue
            block = (start - timedelta(minutes=before), start + timedelta(minutes=duration + after))
            if contains(working, block) and not any(overlaps(block, busy) for busy in blocked):
                slots.append(start)
    return sorted(slots)
