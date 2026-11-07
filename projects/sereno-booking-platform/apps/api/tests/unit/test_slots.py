from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.modules.availability.slot_generator import (
    Policy,
    generate_slots,
    local_instants,
    wall_interval,
)

DAY = date(2026, 2, 2)
NOW = datetime(2026, 2, 1, tzinfo=UTC)
ZONE = ZoneInfo("Europe/London")


def slots(
    duration=60, before=0, after=0, working=None, blocked=None, policy=None, now=NOW, day=DAY
):
    return generate_slots(
        day,
        working if working is not None else wall_interval(day, time(9), time(12), ZONE),
        blocked or [],
        duration,
        before,
        after,
        policy or Policy("Europe/London"),
        now,
    )


def test_duration_must_fit_entire_interval():
    result = slots()
    assert len(result) == 9
    assert result[-1].hour == 11 and result[-1].minute == 0


def test_buffers_apply_before_and_after():
    result = slots(before=15, after=15)
    assert result[0] == datetime(2026, 2, 2, 9, 15, tzinfo=UTC)
    assert result[-1] == datetime(2026, 2, 2, 10, 45, tzinfo=UTC)


def test_half_open_blocking_allows_adjacent_bookings():
    busy = (datetime(2026, 2, 2, 10, tzinfo=UTC), datetime(2026, 2, 2, 11, tzinfo=UTC))
    assert slots(blocked=[busy]) == [
        datetime(2026, 2, 2, 9, tzinfo=UTC),
        datetime(2026, 2, 2, 11, tzinfo=UTC),
    ]


def test_lunch_break_is_not_bookable():
    working = wall_interval(DAY, time(9), time(12), ZONE) + wall_interval(
        DAY, time(13), time(17), ZONE
    )
    assert all(
        not (11 < start.hour < 13 or (start.hour == 11 and start.minute > 0))
        for start in slots(working=working)
    )


def test_partial_time_off_removes_overlapping_slots():
    blocked = wall_interval(DAY, time(10), time(10, 30), ZONE)
    assert datetime(2026, 2, 2, 10, 30, tzinfo=UTC) in slots(blocked=blocked)
    assert datetime(2026, 2, 2, 9, 15, tzinfo=UTC) not in slots(blocked=blocked)


def test_notice_cutoff_inclusive():
    now = datetime(2026, 2, 2, 7, 15, tzinfo=UTC)
    assert slots(now=now)[0] == now + timedelta(hours=2)


def test_horizon_uses_local_calendar_days():
    assert slots(policy=Policy("Europe/London", horizon_days=1))
    assert not slots(day=DAY + timedelta(days=1), policy=Policy("Europe/London", horizon_days=1))


def test_spring_dst_nonexistent_times_are_skipped():
    day = date(2026, 3, 29)
    assert local_instants(day, time(1, 30), ZONE) == []
    result = slots(
        day=day,
        duration=30,
        working=wall_interval(day, time(0), time(4), ZONE),
        now=datetime(2026, 3, 28, tzinfo=UTC),
    )
    assert len(result) == 11
    assert all(s.astimezone(ZONE).hour != 1 for s in result)


def test_autumn_dst_ambiguous_times_return_distinct_instants():
    day = date(2026, 10, 25)
    result = local_instants(day, time(1, 30), ZONE)
    assert len(result) == 2
    assert result[1] - result[0] == timedelta(hours=1)


def test_appointment_spans_offset_change_in_elapsed_time():
    day = date(2026, 3, 29)
    result = slots(
        day=day,
        duration=90,
        working=wall_interval(day, time(0), time(4), ZONE),
        now=datetime(2026, 3, 28, tzinfo=UTC),
    )
    assert datetime(2026, 3, 29, 0, 30, tzinfo=UTC) in result
    end = datetime(2026, 3, 29, 0, 30, tzinfo=UTC) + timedelta(minutes=90)
    assert end.astimezone(ZONE).hour == 3


def test_local_date_boundary_and_non_hour_offset():
    policy = Policy("Asia/Tehran", notice_minutes=0)
    day = date(2026, 2, 2)
    working = wall_interval(day, time(0), time(2), ZoneInfo(policy.timezone))
    now = datetime(2026, 2, 1, 21, tzinfo=UTC)
    result = generate_slots(day, working, [], 30, 0, 0, policy, now)
    assert result[0] == now


def test_empty_working_intervals():
    assert slots(working=[]) == []


def test_naive_now_rejected():
    with pytest.raises(ValueError, match="timezone aware"):
        slots(now=datetime(2026, 2, 1))
