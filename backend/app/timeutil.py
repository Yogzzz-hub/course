from datetime import date, datetime, time, timedelta, timezone

IST_OFFSET = timedelta(hours=5, minutes=30)
WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def utcnow() -> datetime:
    """Current time as a naive UTC datetime. All stored times are UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ist_to_utc(day: date, hhmm: str) -> datetime:
    """Turns a class day and an IST clock time (HH:MM) into a naive UTC datetime."""
    hour, minute = (int(part) for part in hhmm.split(":"))
    local = datetime.combine(day, time(hour, minute))
    return local - IST_OFFSET
