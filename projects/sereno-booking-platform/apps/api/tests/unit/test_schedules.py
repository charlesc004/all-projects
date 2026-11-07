from datetime import date, time

from app.modules.availability.service import day_intervals
from app.modules.models import ScheduleException, WorkingHours


def test_override_replaces_staff_hours_but_respects_studio_hours():
    day = date(2026, 2, 2)
    hours = [
        WorkingHours(staff_id=None, weekday=0, start=time(9), end=time(17)),
        WorkingHours(staff_id=1, weekday=0, start=time(10), end=time(14)),
    ]
    override = ScheduleException(
        date_from=day, date_to=day, kind="open", start=time(8), end=time(18)
    )
    working, blocked = day_intervals(day, hours, [override], "Europe/London")
    assert working[0][0].hour == 9 and working[0][1].hour == 17
    assert not blocked


def test_all_day_closure_takes_priority_over_open_override():
    day = date(2026, 2, 2)
    hours = [WorkingHours(staff_id=None, weekday=0, start=time(9), end=time(17))]
    exceptions = [
        ScheduleException(date_from=day, date_to=day, kind="open", start=time(9), end=time(16)),
        ScheduleException(date_from=day, date_to=day, kind="closed", start=None, end=None),
    ]
    assert not day_intervals(day, hours, exceptions, "Europe/London")[0]
