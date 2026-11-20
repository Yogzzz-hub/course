from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from ..deps import get_db, require_roles
from ..errors import ApiError
from ..models import (
    Assignment,
    Batch,
    BatchTrainer,
    Certificate,
    ClassSession,
    Enrolment,
    Programme,
    Quiz,
    QuizAttempt,
    Submission,
    Task,
    User,
    UserRole,
)
from ..security import hash_password, temporary_password
from ..services import (
    attendance_summary,
    audit,
    batch_last_class_date,
    batch_status,
    certificate_checks,
    fee_summary,
    generate_class_sessions,
    next_certificate_number,
    parse_days,
    seats_taken,
    threshold_percent,
)
from ..timeutil import utcnow

router = APIRouter(prefix="/v1/manager", tags=["manager"])
MANAGER = Depends(require_roles("manager"))


class ProgrammeIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    fee_inr: int = Field(ge=0, le=10_000_000)
    duration_weeks: int = Field(default=0, ge=0, le=200)
    description: str = Field(default="", max_length=4000)


class BatchIn(BaseModel):
    programme_id: int
    name: str = Field(min_length=2, max_length=160)
    start_date: date
    days: list[str] = Field(min_length=1, max_length=7)
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int = Field(ge=15, le=480)
    classes_total: int = Field(ge=1, le=200)
    capacity: int = Field(ge=1, le=500)


class TrainerIn(BaseModel):
    user_id: int


class StudentIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=190)
    phone: str = Field(default="", max_length=30)
    batch_id: int


class EnrolmentStatusIn(BaseModel):
    status: Literal["active", "dropped"]


def get_batch(db: Session, batch_id: int) -> Batch:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise ApiError(404, "NOT_FOUND", "That batch could not be found.")
    return batch


def user_has_role(db: Session, user_id: int, role: str) -> bool:
    return db.scalar(select(UserRole.id).where(UserRole.user_id == user_id, UserRole.role == role)) is not None


@router.get("/overview")
def overview(_: User = MANAGER, db: Session = Depends(get_db)):
    students = db.scalar(select(func.count(UserRole.id)).where(UserRole.role == "student")) or 0
    trainers = db.scalar(select(func.count(UserRole.id)).where(UserRole.role == "trainer")) or 0
    # A batch is still running while any of its classes has not ended yet.
    unfinished = exists().where(ClassSession.batch_id == Batch.id, ClassSession.status != "ended")
    batches_running = db.scalar(select(func.count(Batch.id)).where(unfinished)) or 0
    certificates = db.scalar(select(func.count(Certificate.id)).where(Certificate.revoked.is_(False))) or 0
    awaiting = db.scalar(select(func.count(Enrolment.id)).where(Enrolment.status == "awaiting_payment")) or 0
    return {
        "students": students,
        "trainers": trainers,
        "batches_running": batches_running,
        "certificates_issued": certificates,
        "enrolments_awaiting_payment": awaiting,
    }


@router.get("/programmes")
def list_programmes(_: User = MANAGER, db: Session = Depends(get_db)):
    rows = db.scalars(select(Programme).order_by(Programme.name)).all()
    return {"items": [{"id": p.id, "name": p.name, "fee_inr": p.fee_inr, "duration_weeks": p.duration_weeks, "description": p.description} for p in rows]}


@router.post("/programmes")
def create_programme(body: ProgrammeIn, user: User = MANAGER, db: Session = Depends(get_db)):
    programme = Programme(name=body.name.strip(), fee_inr=body.fee_inr, duration_weeks=body.duration_weeks, description=body.description)
    db.add(programme)
    db.flush()
    audit(db, user.id, "programme.create", "programme", programme.id, {"name": programme.name})
    db.commit()
    return {"id": programme.id}


@router.get("/batches")
def list_batches(_: User = MANAGER, db: Session = Depends(get_db)):
    batches = db.scalars(select(Batch).order_by(Batch.start_date.desc())).all()
    items = []
    for batch in batches:
        programme = db.get(Programme, batch.programme_id)
        trainers = db.scalar(select(func.count(BatchTrainer.id)).where(BatchTrainer.batch_id == batch.id)) or 0
        last_date = batch_last_class_date(db, batch.id)
        items.append(
            {
                "id": batch.id,
                "name": batch.name,
                "programme": programme.name if programme else "",
                "start_date": batch.start_date.isoformat(),
                "days": batch.days,
                "start_time": batch.start_time,
                "duration_minutes": batch.duration_minutes,
                "classes_total": batch.classes_total,
                "capacity": batch.capacity,
                "seats_taken": seats_taken(db, batch.id),
                "trainers": trainers,
                "last_class_date": last_date.isoformat() if last_date else None,
                "status": batch_status(db, batch.id),
            }
        )
    return {"items": items}


@router.post("/batches")
def create_batch(body: BatchIn, user: User = MANAGER, db: Session = Depends(get_db)):
    programme = db.get(Programme, body.programme_id)
    if programme is None:
        raise ApiError(422, "VALIDATION", "Choose a programme.", {"programme_id": "Choose a programme."})
    batch = Batch(
        programme_id=programme.id,
        name=body.name.strip(),
        start_date=body.start_date,
        days=parse_days(body.days),
        start_time=body.start_time,
        duration_minutes=body.duration_minutes,
        classes_total=body.classes_total,
        capacity=body.capacity,
        created_by=user.id,
    )
    db.add(batch)
    db.flush()
    created = generate_class_sessions(db, batch)
    audit(db, user.id, "batch.create", "batch", batch.id, {"name": batch.name, "classes": created})
    db.commit()
    return {"id": batch.id, "classes_created": created}


@router.get("/batches/{batch_id}")
def batch_detail(batch_id: int, _: User = MANAGER, db: Session = Depends(get_db)):
    batch = get_batch(db, batch_id)
    programme = db.get(Programme, batch.programme_id)
    threshold = threshold_percent(db)

    trainer_rows = db.execute(
        select(User).join(BatchTrainer, BatchTrainer.user_id == User.id).where(BatchTrainer.batch_id == batch.id)
    ).scalars().all()

    enrolment_rows = db.scalars(select(Enrolment).where(Enrolment.batch_id == batch.id)).all()
    students = []
    for enrolment in enrolment_rows:
        student = db.get(User, enrolment.user_id)
        attendance = attendance_summary(db, enrolment.user_id, batch.id, threshold)
        fees = fee_summary(db, enrolment)
        students.append(
            {
                "enrolment_id": enrolment.id,
                "user_id": enrolment.user_id,
                "name": student.name if student else "",
                "email": student.email if student else "",
                "status": enrolment.status,
                "fee_total_inr": fees["fee_total_inr"],
                "paid_inr": fees["paid_inr"],
                "balance_inr": fees["balance_inr"],
                "attendance_rate": attendance["rate_percent"],
            }
        )

    classes = db.scalars(select(ClassSession).where(ClassSession.batch_id == batch.id).order_by(ClassSession.sequence)).all()
    assignment_count = db.scalar(select(func.count(Assignment.id)).where(Assignment.batch_id == batch.id)) or 0
    quiz_count = db.scalar(select(func.count(Quiz.id)).where(Quiz.batch_id == batch.id)) or 0

    return {
        "id": batch.id,
        "name": batch.name,
        "programme": {"id": programme.id, "name": programme.name, "fee_inr": programme.fee_inr} if programme else None,
        "start_date": batch.start_date.isoformat(),
        "days": batch.days,
        "start_time": batch.start_time,
        "duration_minutes": batch.duration_minutes,
        "classes_total": batch.classes_total,
        "capacity": batch.capacity,
        "seats_taken": seats_taken(db, batch.id),
        "status": batch_status(db, batch.id),
        "attendance_threshold_percent": threshold,
        "trainers": [{"user_id": t.id, "name": t.name, "email": t.email} for t in trainer_rows],
        "students": students,
        "classes": [
            {
                "id": c.id,
                "sequence": c.sequence,
                "starts_at": c.starts_at.isoformat() + "Z",
                "ends_at": c.ends_at.isoformat() + "Z",
                "status": c.status,
                "recording_url": c.recording_url,
            }
            for c in classes
        ],
        "assignments": assignment_count,
        "quizzes": quiz_count,
    }


@router.post("/batches/{batch_id}/trainers")
def assign_trainer(batch_id: int, body: TrainerIn, user: User = MANAGER, db: Session = Depends(get_db)):
    get_batch(db, batch_id)
    if not user_has_role(db, body.user_id, "trainer"):
        raise ApiError(422, "VALIDATION", "That person is not a trainer yet. Ask the admin to add the trainer role first.", {"user_id": "Not a trainer."})
    exists = db.scalar(select(BatchTrainer.id).where(BatchTrainer.batch_id == batch_id, BatchTrainer.user_id == body.user_id))
    if exists is None:
        db.add(BatchTrainer(batch_id=batch_id, user_id=body.user_id))
        audit(db, user.id, "batch.trainer_assign", "batch", batch_id, {"user_id": body.user_id})
        db.commit()
    return {"ok": True}


@router.delete("/batches/{batch_id}/trainers/{trainer_id}")
def remove_trainer(batch_id: int, trainer_id: int, user: User = MANAGER, db: Session = Depends(get_db)):
    link = db.scalar(select(BatchTrainer).where(BatchTrainer.batch_id == batch_id, BatchTrainer.user_id == trainer_id))
    if link is not None:
        db.delete(link)
        audit(db, user.id, "batch.trainer_remove", "batch", batch_id, {"user_id": trainer_id})
        db.commit()
    return {"ok": True}


@router.get("/staff")
def staff(role: Literal["trainer", "financier", "manager", "admin"] = "trainer", _: User = MANAGER, db: Session = Depends(get_db)):
    users = db.scalars(
        select(User).join(UserRole, UserRole.user_id == User.id).where(UserRole.role == role).order_by(User.name)
    ).all()
    return {"items": [{"id": u.id, "name": u.name, "email": u.email} for u in users]}


@router.get("/students")
def students(_: User = MANAGER, db: Session = Depends(get_db)):
    users = db.execute(
        select(User).join(UserRole, UserRole.user_id == User.id).where(UserRole.role == "student").order_by(User.name)
    ).scalars().all()
    items = []
    for user in users:
        rows = db.scalars(select(Enrolment).where(Enrolment.user_id == user.id)).all()
        items.append(
            {
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "enrolments": [
                    {
                        "id": e.id,
                        "batch_id": e.batch_id,
                        "batch": db.get(Batch, e.batch_id).name if db.get(Batch, e.batch_id) else "",
                        "status": e.status,
                    }
                    for e in rows
                ],
            }
        )
    return {"items": items}


@router.post("/students")
def onboard_student(body: StudentIn, user: User = MANAGER, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise ApiError(409, "EMAIL_EXISTS", "An account with this email already exists.", {"email": "This email already has an account."})
    batch = get_batch(db, body.batch_id)
    if seats_taken(db, batch.id) >= batch.capacity:
        raise ApiError(409, "BATCH_FULL", "This batch has no seats left.")
    programme = db.get(Programme, batch.programme_id)

    password = temporary_password()
    student = User(name=body.name.strip(), email=email, phone=body.phone.strip(), password_hash=hash_password(password))
    db.add(student)
    db.flush()
    db.add(UserRole(user_id=student.id, role="student"))
    enrolment = Enrolment(
        user_id=student.id,
        batch_id=batch.id,
        programme_id=programme.id,
        fee_total_inr=programme.fee_inr,
        status="awaiting_payment",
        enrolled_by=user.id,
    )
    db.add(enrolment)
    db.flush()
    audit(db, user.id, "student.onboard", "enrolment", enrolment.id, {"batch_id": batch.id})
    db.commit()
    return {"user_id": student.id, "enrolment_id": enrolment.id, "temporary_password": password}


@router.patch("/enrolments/{enrolment_id}")
def set_enrolment_status(enrolment_id: int, body: EnrolmentStatusIn, user: User = MANAGER, db: Session = Depends(get_db)):
    enrolment = db.get(Enrolment, enrolment_id)
    if enrolment is None:
        raise ApiError(404, "NOT_FOUND", "That enrolment could not be found.")
    enrolment.status = body.status
    audit(db, user.id, "enrolment.status", "enrolment", enrolment.id, {"status": body.status})
    db.commit()
    return {"ok": True}


@router.get("/certificates/eligibility")
def eligibility(batch_id: int | None = None, _: User = MANAGER, db: Session = Depends(get_db)):
    query = select(Enrolment).where(Enrolment.status.in_(["active", "completed"]))
    if batch_id is not None:
        query = query.where(Enrolment.batch_id == batch_id)
    items = []
    for enrolment in db.scalars(query).all():
        student = db.get(User, enrolment.user_id)
        batch = db.get(Batch, enrolment.batch_id)
        result = certificate_checks(db, enrolment)
        items.append(
            {
                "enrolment_id": enrolment.id,
                "name": student.name if student else "",
                "email": student.email if student else "",
                "batch": batch.name if batch else "",
                "status": enrolment.status,
                "checks": result["checks"],
                "attendance_rate": result["attendance"]["rate_percent"],
                "balance_inr": result["fees"]["balance_inr"],
                "certificate_id": result["certificate_id"],
            }
        )
    return {"items": items}


@router.post("/enrolments/{enrolment_id}/certificate")
def issue_certificate(enrolment_id: int, user: User = MANAGER, db: Session = Depends(get_db)):
    enrolment = db.get(Enrolment, enrolment_id)
    if enrolment is None:
        raise ApiError(404, "NOT_FOUND", "That enrolment could not be found.")
    result = certificate_checks(db, enrolment)
    if not result["checks"]["eligible"]:
        raise ApiError(
            409,
            "NOT_ELIGIBLE",
            "This student does not meet every certificate condition yet.",
            details=result["checks"],
        )
    certificate = Certificate(
        enrolment_id=enrolment.id,
        number=next_certificate_number(db),
        issued_by=user.id,
        issued_at=utcnow(),
    )
    db.add(certificate)
    db.flush()
    enrolment.status = "completed"
    enrolment.completed_at = utcnow()
    audit(db, user.id, "certificate.issue", "certificate", certificate.id, {"number": certificate.number})
    db.commit()
    return {"id": certificate.id, "number": certificate.number}


@router.post("/certificates/{certificate_id}/revoke")
def revoke_certificate(certificate_id: int, user: User = MANAGER, db: Session = Depends(get_db)):
    certificate = db.get(Certificate, certificate_id)
    if certificate is None:
        raise ApiError(404, "NOT_FOUND", "That certificate could not be found.")
    certificate.revoked = True
    audit(db, user.id, "certificate.revoke", "certificate", certificate.id, {"number": certificate.number})
    db.commit()
    return {"ok": True}


@router.get("/certificates")
def list_certificates(_: User = MANAGER, db: Session = Depends(get_db)):
    rows = db.scalars(select(Certificate).order_by(Certificate.issued_at.desc())).all()
    items = []
    for cert in rows:
        enrolment = db.get(Enrolment, cert.enrolment_id)
        student = db.get(User, enrolment.user_id) if enrolment else None
        batch = db.get(Batch, enrolment.batch_id) if enrolment else None
        items.append(
            {
                "id": cert.id,
                "number": cert.number,
                "name": student.name if student else "",
                "batch": batch.name if batch else "",
                "issued_at": cert.issued_at.isoformat() + "Z",
                "revoked": cert.revoked,
            }
        )
    return {"items": items}


@router.get("/tasks-overview")
def tasks_overview(_: User = MANAGER, db: Session = Depends(get_db)):
    items = []
    for batch in db.scalars(select(Batch).order_by(Batch.start_date.desc())).all():
        assignments = db.scalars(select(Assignment.id).where(Assignment.batch_id == batch.id)).all()
        submitted = db.scalar(
            select(func.count(Submission.id)).where(Submission.assignment_id.in_(assignments))
        ) if assignments else 0
        graded = db.scalar(
            select(func.count(Submission.id)).where(
                Submission.assignment_id.in_(assignments), Submission.score.is_not(None)
            )
        ) if assignments else 0
        quizzes = db.scalars(select(Quiz.id).where(Quiz.batch_id == batch.id)).all()
        attempts = db.scalar(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id.in_(quizzes))) if quizzes else 0
        tasks = db.scalar(select(func.count(Task.id)).where(Task.batch_id == batch.id)) or 0
        items.append(
            {
                "batch_id": batch.id,
                "batch": batch.name,
                "assignments": len(assignments),
                "submissions": submitted or 0,
                "graded": graded or 0,
                "quizzes": len(quizzes),
                "quiz_attempts": attempts or 0,
                "tasks": tasks,
            }
        )
    return {"items": items}


@router.get("/batches/{batch_id}/attendance")
def batch_attendance(batch_id: int, _: User = MANAGER, db: Session = Depends(get_db)):
    batch = get_batch(db, batch_id)
    threshold = threshold_percent(db)
    rows = []
    for enrolment in db.scalars(select(Enrolment).where(Enrolment.batch_id == batch.id)).all():
        student = db.get(User, enrolment.user_id)
        summary = attendance_summary(db, enrolment.user_id, batch.id, threshold)
        rows.append({"name": student.name if student else "", "email": student.email if student else "", **summary})
    return {"threshold_percent": threshold, "items": rows}
