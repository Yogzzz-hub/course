"""Business rules shared by the routers: class schedule, attendance, fees, certificates and the audit trail."""
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .errors import ApiError
from .models import (
    AuditLog,
    Batch,
    Certificate,
    ClassSession,
    Enrolment,
    Payment,
    Presence,
    Setting,
)
from .timeutil import WEEKDAY_NAMES, ist_to_utc, utcnow

SEATED_STATUSES = ("awaiting_payment", "active", "completed")


# ---- settings -------------------------------------------------------------------------------

def get_setting(db: Session, key: str, default: str) -> str:
    row = db.get(Setting, key)
    return row.value if row else default


def set_setting(db: Session, key: str, value: str) -> None:
    row = db.get(Setting, key) or Setting(key=key, value=value)
    row.value = value
    db.add(row)


def threshold_percent(db: Session) -> int:
    return int(get_setting(db, "attendance_threshold_percent", str(get_settings().attendance_default_percent)))


def fees_must_clear(db: Session) -> bool:
    return get_setting(db, "require_fees_cleared", "true") == "true"


# ---- audit ---------------------------------------------------------------------------------

def audit(db: Session, actor_id: int | None, action: str, entity: str, entity_id: object, detail: dict | None = None) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, entity=entity, entity_id=str(entity_id), detail=detail or {}, at=utcnow()))


# ---- class schedule -------------------------------------------------------------------------

def parse_days(days: list[str]) -> str:
    chosen = {day for day in days if day in WEEKDAY_NAMES}
    if not chosen:
        raise ApiError(422, "VALIDATION", "Choose at least one class day.", {"days": "Choose at least one class day."})
    return ",".join(day for day in WEEKDAY_NAMES if day in chosen)


def generate_class_sessions(db: Session, batch: Batch) -> int:
    """Creates the scheduled classes for a batch: classes_total sessions on the chosen weekdays, from the start date."""
    wanted = {WEEKDAY_NAMES.index(day) for day in batch.days.split(",")}
    current = batch.start_date
    created = 0
    while created < batch.classes_total:
        if current.weekday() in wanted:
            created += 1
            starts = ist_to_utc(current, batch.start_time)
            db.add(
                ClassSession(
                    batch_id=batch.id,
                    sequence=created,
                    starts_at=starts,
                    ends_at=starts + timedelta(minutes=batch.duration_minutes),
                    status="scheduled",
                )
            )
        current += timedelta(days=1)
    return created


def batch_last_class_date(db: Session, batch_id: int) -> date | None:
    last = db.scalar(select(func.max(ClassSession.starts_at)).where(ClassSession.batch_id == batch_id))
    return last.date() if last else None


# ---- money ----------------------------------------------------------------------------------

def verified_total(db: Session, enrolment_id: int) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(Payment.amount_inr), 0)).where(
            Payment.enrolment_id == enrolment_id, Payment.status == "verified"
        )
    )
    return int(total or 0)


def fee_summary(db: Session, enrolment: Enrolment) -> dict:
    paid = verified_total(db, enrolment.id)
    return {
        "fee_total_inr": enrolment.fee_total_inr,
        "paid_inr": paid,
        "balance_inr": max(enrolment.fee_total_inr - paid, 0),
    }


# ---- attendance -----------------------------------------------------------------------------

def class_duration_seconds(cls: ClassSession) -> int:
    return max(int((cls.ends_at - cls.starts_at).total_seconds()), 1)


def class_attendance(db: Session, cls: ClassSession, user_id: int, threshold: int) -> dict:
    presence = db.scalar(select(Presence).where(Presence.class_id == cls.id, Presence.user_id == user_id))
    seconds = presence.seconds if presence else 0
    percent = min(100, round(seconds * 100 / class_duration_seconds(cls)))
    return {"seconds": seconds, "percent": percent, "attended": percent >= threshold}


def attendance_summary(db: Session, user_id: int, batch_id: int, threshold: int) -> dict:
    ended = db.scalars(
        select(ClassSession).where(ClassSession.batch_id == batch_id, ClassSession.status == "ended")
    ).all()
    attended = sum(1 for cls in ended if class_attendance(db, cls, user_id, threshold)["attended"])
    rate = round(attended * 100 / len(ended)) if ended else None
    return {"ended_classes": len(ended), "attended_classes": attended, "rate_percent": rate}


# ---- certificates ----------------------------------------------------------------------------

def certificate_checks(db: Session, enrolment: Enrolment) -> dict:
    threshold = threshold_percent(db)
    total = db.scalar(
        select(func.count(ClassSession.id)).where(
            ClassSession.batch_id == enrolment.batch_id, ClassSession.status != "cancelled"
        )
    ) or 0
    ended = db.scalar(
        select(func.count(ClassSession.id)).where(
            ClassSession.batch_id == enrolment.batch_id, ClassSession.status == "ended"
        )
    ) or 0
    attendance = attendance_summary(db, enrolment.user_id, enrolment.batch_id, threshold)
    fees = fee_summary(db, enrolment)
    issued = db.scalar(
        select(Certificate).where(Certificate.enrolment_id == enrolment.id, Certificate.revoked.is_(False))
    )
    checks = {
        "all_classes_ended": total > 0 and ended == total,
        "attendance_ok": attendance["rate_percent"] is not None and attendance["rate_percent"] >= threshold,
        "fees_cleared": fees["balance_inr"] == 0 if fees_must_clear(db) else True,
        "not_already_issued": issued is None,
    }
    checks["eligible"] = all(checks.values())
    return {
        "checks": checks,
        "attendance": attendance,
        "fees": fees,
        "threshold_percent": threshold,
        "classes_total": total,
        "classes_ended": ended,
        "certificate_id": issued.id if issued else None,
    }


def next_certificate_number(db: Session) -> str:
    count = db.scalar(select(func.count(Certificate.id))) or 0
    year = datetime.now().year
    return f"AIN-{year}-{count + 1:05d}"


def seats_taken(db: Session, batch_id: int) -> int:
    return db.scalar(
        select(func.count(Enrolment.id)).where(
            Enrolment.batch_id == batch_id, Enrolment.status.in_(SEATED_STATUSES)
        )
    ) or 0
