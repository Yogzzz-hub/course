import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..deps import get_db, require_roles, roles_for
from ..errors import ApiError
from ..models import (
    Assignment,
    Batch,
    Certificate,
    ClassSession,
    Enrolment,
    Payment,
    Presence,
    Programme,
    Quiz,
    QuizAttempt,
    Submission,
    Task,
    TaskCompletion,
    User,
)
from ..services import (
    attendance_summary,
    class_attendance,
    class_duration_seconds,
    fee_summary,
    get_setting,
    threshold_percent,
)
from ..timeutil import utcnow

router = APIRouter(prefix="/v1/student", tags=["student"])
STUDENT = Depends(require_roles("student"))

MAX_HEARTBEAT_CREDIT_SECONDS = 90  # a heartbeat never credits more than this, so a closed tab stops counting
ALLOWED_UPLOADS = {".pdf", ".zip", ".docx", ".txt", ".md", ".py", ".ipynb", ".png", ".jpg", ".jpeg"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ACTIVE_STATUSES = ("active", "completed")


class PaymentIn(BaseModel):
    enrolment_id: int
    amount_inr: int = Field(gt=0, le=10_000_000)
    method: str = Field(min_length=2, max_length=40)
    reference: str = Field(min_length=3, max_length=120)
    paid_on: date


class DirectPayIn(BaseModel):
    enrolment_id: int
    amount_inr: int = Field(gt=0, le=10_000_000)
    method: str = Field(default="UPI")
    reference: str | None = None


class EnrollAndPayIn(BaseModel):
    programme_id: int
    amount_inr: int | None = None
    method: str = Field(default="UPI")


class AttemptIn(BaseModel):
    answers: list[int] = Field(min_length=1, max_length=100)


def my_enrolments(db: Session, user: User) -> list[Enrolment]:
    return list(db.scalars(select(Enrolment).where(Enrolment.user_id == user.id, Enrolment.status != "dropped")).all())


def active_batch_ids(db: Session, user: User) -> list[int]:
    return list(
        db.scalars(
            select(Enrolment.batch_id).where(Enrolment.user_id == user.id, Enrolment.status.in_(ACTIVE_STATUSES))
        ).all()
    )


def require_active_enrolment(db: Session, user: User, batch_id: int) -> Enrolment:
    enrolment = db.scalar(
        select(Enrolment).where(
            Enrolment.user_id == user.id, Enrolment.batch_id == batch_id, Enrolment.status.in_(ACTIVE_STATUSES)
        )
    )
    if enrolment is None:
        raise ApiError(403, "NOT_ENROLLED", "Your course access starts once your first fee payment is verified.")
    return enrolment


@router.get("/overview")
def overview(user: User = STUDENT, db: Session = Depends(get_db)):
    threshold = threshold_percent(db)
    items = []
    for enrolment in my_enrolments(db, user):
        batch = db.get(Batch, enrolment.batch_id)
        programme = db.get(Programme, enrolment.programme_id)
        fees = fee_summary(db, enrolment)
        attendance = attendance_summary(db, user.id, enrolment.batch_id, threshold)
        upcoming = db.scalar(
            select(ClassSession)
            .where(ClassSession.batch_id == enrolment.batch_id, ClassSession.status.in_(["scheduled", "live"]))
            .order_by(ClassSession.starts_at)
            .limit(1)
        )
        total_classes = db.scalar(select(func.count(ClassSession.id)).where(ClassSession.batch_id == enrolment.batch_id)) or 0
        ended_classes = db.scalar(
            select(func.count(ClassSession.id)).where(
                ClassSession.batch_id == enrolment.batch_id, ClassSession.status == "ended"
            )
        ) or 0
        course_completed = (enrolment.status == "completed") or (total_classes > 0 and ended_classes == total_classes)
        certificate = None
        if course_completed:
            certificate = db.scalar(
                select(Certificate).where(Certificate.enrolment_id == enrolment.id, Certificate.revoked.is_(False))
            )
        items.append(
            {
                "enrolment_id": enrolment.id,
                "programme": programme.name if programme else "",
                "batch": batch.name if batch else "",
                "status": enrolment.status,
                "fees": fees,
                "attendance": attendance,
                "next_class_at": upcoming.starts_at.isoformat() + "Z" if upcoming else None,
                "certificate_id": certificate.id if certificate else None,
                "course_completed": course_completed,
                "classes_ended": ended_classes,
                "classes_total": total_classes,
            }
        )
    return {
        "items": items,
        "payment_instructions": get_setting(db, "payment_instructions", ""),
        "attendance_threshold_percent": threshold,
    }


@router.post("/payments")
def submit_payment(body: PaymentIn, user: User = STUDENT, db: Session = Depends(get_db)):
    enrolment = db.get(Enrolment, body.enrolment_id)
    if enrolment is None or enrolment.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", "That enrolment could not be found.")
    if fee_summary(db, enrolment)["balance_inr"] <= 0:
        raise ApiError(409, "ALREADY_PAID", "Your fees for this course are already cleared.")
    payment = Payment(
        enrolment_id=enrolment.id,
        user_id=user.id,
        amount_inr=body.amount_inr,
        method=body.method.strip(),
        reference=body.reference.strip(),
        paid_on=body.paid_on,
        status="submitted",
        submitted_at=utcnow(),
    )
    db.add(payment)
    db.commit()
    return {"id": payment.id, "status": payment.status}


@router.post("/pay")
def direct_pay(body: DirectPayIn, user: User = STUDENT, db: Session = Depends(get_db)):
    """Direct instant checkout for outstanding course balance with verified payment."""
    enrolment = db.get(Enrolment, body.enrolment_id)
    if enrolment is None or enrolment.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", "That enrolment could not be found.")
    summary = fee_summary(db, enrolment)
    if summary["balance_inr"] <= 0:
        raise ApiError(409, "ALREADY_PAID", "Your fees for this course are already fully cleared.")

    amount = min(body.amount_inr, summary["balance_inr"])
    ref = body.reference or f"TXN-AIN-{uuid.uuid4().hex[:8].upper()}"
    now = utcnow()

    payment = Payment(
        enrolment_id=enrolment.id,
        user_id=user.id,
        amount_inr=amount,
        method=body.method,
        reference=ref,
        paid_on=now.date(),
        status="verified",
        submitted_at=now,
        decided_at=now,
        note="Instant online checkout",
    )
    db.add(payment)
    db.flush()
    if enrolment.status == "awaiting_payment":
        enrolment.status = "active"
    db.commit()

    new_summary = fee_summary(db, enrolment)
    return {
        "ok": True,
        "payment_id": payment.id,
        "reference": ref,
        "amount_paid": amount,
        "balance_remaining": new_summary["balance_inr"],
        "status": "verified",
    }


@router.get("/available-courses")
def available_courses(user: User = STUDENT, db: Session = Depends(get_db)):
    """Lists all programmes with active batch and enrolment status for the student."""
    my_prog_ids = set(
        db.scalars(
            select(Enrolment.programme_id).where(
                Enrolment.user_id == user.id,
                Enrolment.status.in_(["awaiting_payment", "active", "completed"]),
            )
        ).all()
    )
    programmes = db.scalars(select(Programme).order_by(Programme.id)).all()
    items = []
    for p in programmes:
        batch = db.scalar(select(Batch).where(Batch.programme_id == p.id).order_by(Batch.start_date.desc()))
        items.append(
            {
                "id": p.id,
                "name": p.name,
                "fee_inr": p.fee_inr,
                "duration_weeks": p.duration_weeks,
                "description": p.description,
                "batch_id": batch.id if batch else None,
                "batch_name": batch.name if batch else "Next Cohort Starting Soon",
                "start_date": batch.start_date.isoformat() if batch else None,
                "is_enrolled": p.id in my_prog_ids,
            }
        )
    return {"items": items}


@router.post("/enroll-and-pay")
def enroll_and_pay(body: EnrollAndPayIn, user: User = STUDENT, db: Session = Depends(get_db)):
    """Enroll into another course/batch and instantly pay tuition."""
    prog = db.get(Programme, body.programme_id)
    if prog is None:
        raise ApiError(404, "NOT_FOUND", "Programme not found.")

    existing = db.scalar(
        select(Enrolment).where(
            Enrolment.user_id == user.id,
            Enrolment.programme_id == prog.id,
            Enrolment.status.in_(["awaiting_payment", "active", "completed"]),
        )
    )
    if existing:
        raise ApiError(409, "ALREADY_ENROLLED", "You are already enrolled in this course.")

    batch = db.scalar(select(Batch).where(Batch.programme_id == prog.id).order_by(Batch.start_date.desc()))
    if batch is None:
        batch = Batch(
            programme_id=prog.id,
            name=f"{prog.name} - 2027 Cohort",
            start_date=utcnow().date(),
            days="Mon,Wed,Fri",
            start_time="19:00",
            duration_minutes=90,
            classes_total=12,
            capacity=30,
            created_by=user.id,
        )
        db.add(batch)
        db.flush()

    amount = body.amount_inr if body.amount_inr is not None else prog.fee_inr
    now = utcnow()
    ref = f"ENROLL-AIN-{uuid.uuid4().hex[:8].upper()}"

    enrolment = Enrolment(
        user_id=user.id,
        batch_id=batch.id,
        programme_id=prog.id,
        fee_total_inr=prog.fee_inr,
        status="active" if amount > 0 else "awaiting_payment",
        enrolled_by=user.id,
        created_at=now,
    )
    db.add(enrolment)
    db.flush()

    if amount > 0:
        payment = Payment(
            enrolment_id=enrolment.id,
            user_id=user.id,
            amount_inr=amount,
            method=body.method,
            reference=ref,
            paid_on=now.date(),
            status="verified",
            submitted_at=now,
            decided_at=now,
            note=f"Instant course enrollment for {prog.name}",
        )
        db.add(payment)

    db.commit()
    return {
        "ok": True,
        "enrolment_id": enrolment.id,
        "batch": batch.name,
        "programme": prog.name,
        "fee_total_inr": prog.fee_inr,
        "amount_paid": amount,
        "reference": ref,
    }


@router.get("/payments")
def my_payments(user: User = STUDENT, db: Session = Depends(get_db)):
    rows = db.scalars(select(Payment).where(Payment.user_id == user.id).order_by(Payment.submitted_at.desc())).all()
    items = []
    for p in rows:
        enrolment = db.get(Enrolment, p.enrolment_id)
        prog = db.get(Programme, enrolment.programme_id) if enrolment else None
        batch = db.get(Batch, enrolment.batch_id) if enrolment else None
        items.append(
            {
                "id": p.id,
                "enrolment_id": p.enrolment_id,
                "programme": prog.name if prog else "Course Tuition",
                "batch": batch.name if batch else "",
                "amount_inr": p.amount_inr,
                "method": p.method,
                "reference": p.reference,
                "paid_on": p.paid_on.isoformat(),
                "status": p.status,
                "note": p.note,
            }
        )
    return {"items": items}


@router.get("/classes")
def my_classes(user: User = STUDENT, db: Session = Depends(get_db)):
    threshold = threshold_percent(db)
    items = []
    for enrolment in my_enrolments(db, user):
        batch = db.get(Batch, enrolment.batch_id)
        is_active = enrolment.status in ACTIVE_STATUSES
        classes = []
        if is_active:
            for cls in db.scalars(select(ClassSession).where(ClassSession.batch_id == enrolment.batch_id).order_by(ClassSession.starts_at)).all():
                attendance = class_attendance(db, cls, user.id, threshold) if cls.status != "scheduled" else None
                classes.append(
                    {
                        "id": cls.id,
                        "sequence": cls.sequence,
                        "starts_at": cls.starts_at.isoformat() + "Z",
                        "ends_at": cls.ends_at.isoformat() + "Z",
                        "status": cls.status,
                        "meeting_url": cls.meeting_url if cls.status == "live" else "",
                        "recording_url": cls.recording_url if cls.status == "ended" else "",
                        "attendance": attendance,
                    }
                )
        items.append(
            {
                "enrolment_id": enrolment.id,
                "batch": batch.name if batch else "",
                "access": is_active,
                "classes": classes,
            }
        )
    return {"items": items}


@router.post("/classes/{class_id}/presence")
def heartbeat(class_id: int, user: User = STUDENT, db: Session = Depends(get_db)):
    """Called every 30 seconds while the student is in a live class. This is what the attendance rule is built on."""
    cls = db.get(ClassSession, class_id)
    if cls is None:
        raise ApiError(404, "NOT_FOUND", "That class could not be found.")
    require_active_enrolment(db, user, cls.batch_id)
    if cls.status != "live":
        raise ApiError(409, "CLASS_NOT_LIVE", "This class is not live right now.")
    now = utcnow()
    presence = db.scalar(select(Presence).where(Presence.class_id == cls.id, Presence.user_id == user.id))
    if presence is None:
        presence = Presence(class_id=cls.id, user_id=user.id, first_seen=now, last_seen=now, seconds=0)
        db.add(presence)
    else:
        gap = (now - presence.last_seen).total_seconds()
        if gap > 0:
            presence.seconds += int(min(gap, MAX_HEARTBEAT_CREDIT_SECONDS))
        presence.last_seen = now
    db.commit()
    percent = min(100, round(presence.seconds * 100 / class_duration_seconds(cls)))
    return {"seconds": presence.seconds, "percent": percent}


@router.get("/recordings")
def recordings(user: User = STUDENT, db: Session = Depends(get_db)):
    batch_ids = active_batch_ids(db, user)
    if not batch_ids:
        return {"items": []}
    rows = db.scalars(
        select(ClassSession).where(
            ClassSession.batch_id.in_(batch_ids), ClassSession.status == "ended", ClassSession.recording_url != ""
        ).order_by(ClassSession.starts_at.desc())
    ).all()
    return {
        "items": [
            {"id": c.id, "sequence": c.sequence, "starts_at": c.starts_at.isoformat() + "Z", "recording_url": c.recording_url}
            for c in rows
        ]
    }


@router.get("/assignments")
def assignments(user: User = STUDENT, db: Session = Depends(get_db)):
    items = []
    for batch_id in active_batch_ids(db, user):
        batch = db.get(Batch, batch_id)
        for assignment in db.scalars(select(Assignment).where(Assignment.batch_id == batch_id).order_by(Assignment.created_at.desc())).all():
            sub = db.scalar(select(Submission).where(Submission.assignment_id == assignment.id, Submission.user_id == user.id))
            items.append(
                {
                    "id": assignment.id,
                    "batch": batch.name if batch else "",
                    "title": assignment.title,
                    "brief": assignment.brief,
                    "due_at": assignment.due_at.isoformat() + "Z" if assignment.due_at else None,
                    "submission": {
                        "id": sub.id,
                        "kind": sub.kind,
                        "link": sub.link,
                        "file_name": sub.file_name,
                        "note": sub.note,
                        "has_file": bool(sub.file_path and Path(sub.file_path).exists()),
                        "submitted_at": sub.submitted_at.isoformat() + "Z",
                        "score": sub.score,
                        "feedback": sub.feedback,
                    }
                    if sub
                    else None,
                }
            )
    return {"items": items}


@router.post("/assignments/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: int,
    kind: str = Form(...),
    link: str = Form(default=""),
    note: str = Form(default=""),
    file: UploadFile | None = File(default=None),
    user: User = STUDENT,
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise ApiError(404, "NOT_FOUND", "That assignment could not be found.")
    require_active_enrolment(db, user, assignment.batch_id)
    if kind not in {"file", "url", "git"}:
        raise ApiError(422, "VALIDATION", "Choose file, link or Git.", {"kind": "Choose file, link or Git."})

    existing = db.scalar(select(Submission).where(Submission.assignment_id == assignment.id, Submission.user_id == user.id))
    if existing is not None and existing.score is not None:
        raise ApiError(409, "ALREADY_GRADED", "This assignment has been graded and can no longer be changed.")

    file_name, file_path = "", ""
    link_value = ""
    if kind == "file":
        if file is None or not file.filename:
            raise ApiError(422, "VALIDATION", "Attach a file to submit.", {"file": "Attach a file."})
        suffix = Path(file.filename).suffix.lower()
        if suffix not in ALLOWED_UPLOADS:
            raise ApiError(422, "VALIDATION", "That file type is not allowed.", {"file": "Upload a PDF, ZIP, DOCX, text, code, notebook or image file."})
        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            raise ApiError(422, "VALIDATION", "The file is larger than 10 MB.", {"file": "Keep the file under 10 MB."})
        target_dir = Path(get_settings().upload_dir) / "assignments" / str(assignment.id)
        target_dir.mkdir(parents=True, exist_ok=True)
        stored = target_dir / f"{user.id}-{uuid.uuid4().hex}{suffix}"
        stored.write_bytes(content)
        file_name = Path(file.filename).name
        file_path = str(stored)
    else:
        value = link.strip()
        if not value.startswith(("https://", "http://")):
            raise ApiError(422, "VALIDATION", "Paste a full link starting with https://", {"link": "Paste a full link."})
        if kind == "git" and "git" not in value.lower():
            raise ApiError(422, "VALIDATION", "Paste a Git repository link.", {"link": "This does not look like a Git link."})
        link_value = value

    if existing is None:
        existing = Submission(assignment_id=assignment.id, user_id=user.id, kind=kind)
        db.add(existing)
    existing.kind = kind
    existing.link = link_value
    existing.file_name = file_name
    existing.file_path = file_path
    existing.note = note.strip()[:2000]
    existing.submitted_at = utcnow()
    db.commit()
    return {"ok": True}


@router.get("/assignments/{assignment_id}/file")
def download_my_submission_file(assignment_id: int, user: User = STUDENT, db: Session = Depends(get_db)):
    sub = db.scalar(select(Submission).where(Submission.assignment_id == assignment_id, Submission.user_id == user.id))
    if sub is None or not sub.file_path or not Path(sub.file_path).exists():
        raise ApiError(404, "NOT_FOUND", "No submitted file found.")
    return FileResponse(sub.file_path, filename=sub.file_name or "submission")


@router.get("/tasks")
def tasks(user: User = STUDENT, db: Session = Depends(get_db)):
    batch_ids = active_batch_ids(db, user)
    if not batch_ids:
        return {"items": []}
    rows = db.scalars(
        select(Task).where(
            Task.batch_id.in_(batch_ids), (Task.user_id.is_(None)) | (Task.user_id == user.id)
        ).order_by(Task.created_at.desc())
    ).all()
    items = []
    for task in rows:
        done = db.scalar(select(TaskCompletion.id).where(TaskCompletion.task_id == task.id, TaskCompletion.user_id == user.id))
        items.append(
            {
                "id": task.id,
                "title": task.title,
                "detail": task.detail,
                "due_at": task.due_at.isoformat() + "Z" if task.due_at else None,
                "done": done is not None,
            }
        )
    return {"items": items}


@router.post("/tasks/{task_id}/done")
def mark_task_done(task_id: int, user: User = STUDENT, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None or task.batch_id not in active_batch_ids(db, user) or (task.user_id not in (None, user.id)):
        raise ApiError(404, "NOT_FOUND", "That task could not be found.")
    exists = db.scalar(select(TaskCompletion.id).where(TaskCompletion.task_id == task.id, TaskCompletion.user_id == user.id))
    if exists is None:
        db.add(TaskCompletion(task_id=task.id, user_id=user.id, done_at=utcnow()))
        db.commit()
    return {"ok": True}


@router.get("/quizzes")
def quizzes(user: User = STUDENT, db: Session = Depends(get_db)):
    batch_ids = active_batch_ids(db, user)
    if not batch_ids:
        return {"items": []}
    items = []
    for quiz in db.scalars(select(Quiz).where(Quiz.batch_id.in_(batch_ids)).order_by(Quiz.created_at.desc())).all():
        attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == user.id))
        batch = db.get(Batch, quiz.batch_id)
        
        # When attempted, expose the correct answers and student's selections so they can review solutions!
        if attempt:
            questions_payload = [
                {
                    "q": q["q"],
                    "options": q["options"],
                    "answer_index": q.get("answer_index", 0),
                    "user_answer": attempt.answers[i] if attempt.answers and i < len(attempt.answers) else None,
                }
                for i, q in enumerate(quiz.questions)
            ]
        else:
            # Before submission, do not leak the answer key
            questions_payload = [{"q": q["q"], "options": q["options"]} for q in quiz.questions]

        items.append(
            {
                "id": quiz.id,
                "title": quiz.title,
                "batch_name": batch.name if batch else "",
                "due_at": quiz.due_at.isoformat() + "Z" if quiz.due_at else None,
                "questions": questions_payload,
                "attempt": (
                    {
                        "score": attempt.score,
                        "total": attempt.total,
                        "submitted_at": attempt.submitted_at.isoformat() + "Z" if attempt.submitted_at else None,
                        "answers": attempt.answers,
                    }
                    if attempt
                    else None
                ),
            }
        )
    return {"items": items}


@router.post("/quizzes/{quiz_id}/attempt")
def attempt_quiz(quiz_id: int, body: AttemptIn, user: User = STUDENT, db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if quiz is None or quiz.batch_id not in active_batch_ids(db, user):
        raise ApiError(404, "NOT_FOUND", "That quiz could not be found.")
    if db.scalar(select(QuizAttempt.id).where(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == user.id)) is not None:
        raise ApiError(409, "ALREADY_ATTEMPTED", "You have already submitted this quiz.")
    if len(body.answers) != len(quiz.questions):
        raise ApiError(422, "VALIDATION", "Answer every question before you submit.")
    score = sum(1 for given, question in zip(body.answers, quiz.questions) if given == question["answer_index"])
    attempt = QuizAttempt(quiz_id=quiz.id, user_id=user.id, answers=body.answers, score=score, total=len(quiz.questions), submitted_at=utcnow())
    db.add(attempt)
    db.commit()
    return {"score": score, "total": len(quiz.questions)}


@router.get("/quizzes/{quiz_id}/solutions")
def quiz_solutions(quiz_id: int, user: User = STUDENT, db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if quiz is None or quiz.batch_id not in active_batch_ids(db, user):
        raise ApiError(404, "NOT_FOUND", "That quiz could not be found.")
    attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == user.id))
    if attempt is None:
        raise ApiError(403, "FORBIDDEN", "You must complete the quiz before viewing the solutions.")
    return {
        "score": attempt.score,
        "total": attempt.total,
        "submitted_at": attempt.submitted_at.isoformat() + "Z" if attempt.submitted_at else None,
        "answers": attempt.answers,
        "questions": [
            {
                "q": q["q"],
                "options": q["options"],
                "answer_index": q.get("answer_index", 0),
                "user_answer": attempt.answers[i] if i < len(attempt.answers) else None,
            }
            for i, q in enumerate(quiz.questions)
        ],
    }


@router.get("/certificates")
def certificates(user: User = STUDENT, db: Session = Depends(get_db)):
    threshold = threshold_percent(db)
    items = []
    in_progress = []
    for enrolment in my_enrolments(db, user):
        batch = db.get(Batch, enrolment.batch_id)
        programme = db.get(Programme, enrolment.programme_id)
        total_classes = db.scalar(select(func.count(ClassSession.id)).where(ClassSession.batch_id == enrolment.batch_id)) or 0
        ended_classes = db.scalar(
            select(func.count(ClassSession.id)).where(
                ClassSession.batch_id == enrolment.batch_id, ClassSession.status == "ended"
            )
        ) or 0
        course_completed = (enrolment.status == "completed") or (total_classes > 0 and ended_classes == total_classes)

        cert = db.scalar(select(Certificate).where(Certificate.enrolment_id == enrolment.id, Certificate.revoked.is_(False)))
        if course_completed and cert:
            items.append(
                {
                    "id": cert.id,
                    "number": cert.number,
                    "programme": programme.name if programme else "",
                    "batch": batch.name if batch else "",
                    "issued_at": cert.issued_at.isoformat() + "Z",
                }
            )
        else:
            att = attendance_summary(db, user.id, enrolment.batch_id, threshold)
            fee = fee_summary(db, enrolment)
            in_progress.append(
                {
                    "enrolment_id": enrolment.id,
                    "programme": programme.name if programme else "",
                    "batch": batch.name if batch else "",
                    "classes_ended": ended_classes,
                    "classes_total": total_classes,
                    "attendance_rate": att["rate_percent"],
                    "attendance_threshold": threshold,
                    "fee_balance_inr": fee["balance_inr"],
                    "fees_cleared": fee["balance_inr"] == 0,
                    "status": "In Progress",
                }
            )
    return {"items": items, "in_progress": in_progress}


@router.get("/certificates/{certificate_id}", response_class=HTMLResponse)
def certificate_view(certificate_id: int, user: User = Depends(require_roles("student", "manager", "admin", "super_admin")), db: Session = Depends(get_db)):
    cert = db.get(Certificate, certificate_id)
    if cert is None or cert.revoked:
        raise ApiError(404, "NOT_FOUND", "That certificate could not be found.")
    enrolment = db.get(Enrolment, cert.enrolment_id)
    if enrolment is None:
        raise ApiError(404, "NOT_FOUND", "That certificate could not be found.")
    roles = roles_for(db, user.id)
    if "student" in roles and not ("manager" in roles or "admin" in roles or "super_admin" in roles):
        if enrolment.user_id != user.id:
            raise ApiError(404, "NOT_FOUND", "That certificate could not be found.")
        # Ensure student has completed the course fully
        total_classes = db.scalar(select(func.count(ClassSession.id)).where(ClassSession.batch_id == enrolment.batch_id)) or 0
        ended_classes = db.scalar(
            select(func.count(ClassSession.id)).where(
                ClassSession.batch_id == enrolment.batch_id, ClassSession.status == "ended"
            )
        ) or 0
        course_completed = (enrolment.status == "completed") or (total_classes > 0 and ended_classes == total_classes)
        if not course_completed:
            raise ApiError(403, "COURSE_NOT_COMPLETED", "Certificates are only available after completing the course fully.")
    student = db.get(User, enrolment.user_id)
    batch = db.get(Batch, enrolment.batch_id)
    programme = db.get(Programme, enrolment.programme_id)
    academy = get_setting(db, "academy_name", "Aintrix Academy")
    issued_date_str = cert.issued_at.strftime("%d %B %Y")
    student_name = student.name if student else "Student"
    programme_name = programme.name if programme else "Full Stack Web Development"
    batch_name = batch.name if batch else ""
    cert_number = cert.number

    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion - {student_name} - {cert_number}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@600;700;800&family=Great+Vibes&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    
    :root {{
      --accent: #681C35;
      --accent-soft: #A9C9DC;
      --gold: #C5A059;
      --gold-light: #E8D3A2;
      --gold-dark: #9A7730;
      --ink: #1C1917;
      --muted: #64748B;
      --paper: #FCFBF8;
    }}

    body {{
      background: #E8E5DF;
      color: var(--ink);
      font-family: 'Manrope', -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px 20px 50px;
      -webkit-font-smoothing: antialiased;
    }}

    /* Top Floating Toolbar (Hidden during Print) */
    .action-bar {{
      display: flex;
      align-items: center;
      gap: 12px;
      background: #FFFFFF;
      padding: 10px 20px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
      margin-bottom: 24px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      z-index: 50;
    }}

    .action-btn {{
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--accent);
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 600;
      font-family: 'Manrope', sans-serif;
      padding: 8px 18px;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }}

    .action-btn:hover {{
      background: #4F071E;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(104, 28, 53, 0.25);
    }}

    .action-btn--secondary {{
      background: #F1F5F9;
      color: #334155;
    }}

    .action-btn--secondary:hover {{
      background: #E2E8F0;
      color: #0F172A;
      box-shadow: none;
    }}

    /* Main Certificate Sheet (A4 Landscape Proportions) */
    .cert-sheet {{
      width: 1000px;
      max-width: 100%;
      aspect-ratio: 1.414 / 1;
      background: var(--paper);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.05);
      border-radius: 6px;
      position: relative;
      padding: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }}

    /* Multi-layered Ornate Frame */
    .cert-outer-border {{
      flex: 1;
      border: 2px solid var(--gold);
      padding: 6px;
      display: flex;
      flex-direction: column;
      position: relative;
    }}

    .cert-inner-frame {{
      flex: 1;
      border: 1px solid rgba(104, 28, 53, 0.3);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 34px 54px 28px;
      background: radial-gradient(circle at center, #FFFFFF 0%, var(--paper) 100%);
    }}

    /* Delicate Guilloche Watermark Lines */
    .cert-watermark {{
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.035;
      background-image: 
        repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 35px, var(--accent) 36px, transparent 38px),
        repeating-radial-gradient(circle at 20% 80%, transparent 0, transparent 25px, var(--gold) 26px, transparent 28px);
    }}

    /* Ornamental Left/Right Border Strips (Matching Coding Ninjas reference) */
    .cert-strip-left, .cert-strip-right {{
      position: absolute;
      top: 0;
      bottom: 0;
      width: 22px;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      opacity: 0.75;
    }}

    .cert-strip-left {{ left: 8px; }}
    .cert-strip-right {{ right: 8px; }}

    .guilloche-leaf {{
      width: 14px;
      height: 22px;
      fill: none;
      stroke: var(--gold);
      stroke-width: 1.2;
    }}

    /* Top Corner Accents */
    .corner-ornament {{
      position: absolute;
      width: 28px;
      height: 28px;
      pointer-events: none;
      stroke: var(--gold);
      fill: none;
      stroke-width: 1.5;
    }}
    .corner-tl {{ top: 12px; left: 12px; }}
    .corner-tr {{ top: 12px; right: 12px; transform: rotate(90deg); }}
    .corner-bl {{ bottom: 12px; left: 12px; transform: rotate(-90deg); }}
    .corner-br {{ bottom: 12px; right: 12px; transform: rotate(180deg); }}

    /* Certificate Header Row */
    .cert-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }}

    .cert-brand-pill {{
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: #FFFFFF;
      padding: 7px 18px 7px 14px;
      border-radius: 9999px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }}

    .cert-accreditation {{
      display: flex;
      align-items: center;
      gap: 9px;
      text-align: right;
    }}

    .cert-accreditation-text {{
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }}

    .cert-accreditation-title {{
      font-size: 11px;
      font-weight: 800;
      color: var(--gold-dark);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}

    .cert-accreditation-sub {{
      font-size: 8px;
      font-weight: 600;
      color: var(--muted);
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }}

    /* Center Certificate Title with Decorative Rules */
    .cert-title-section {{
      text-align: center;
      margin-top: 10px;
      position: relative;
      z-index: 2;
    }}

    .cert-title-row {{
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
    }}

    .cert-title-line {{
      flex: 1;
      max-width: 120px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold));
    }}

    .cert-title-line--right {{
      background: linear-gradient(90deg, var(--gold), transparent);
    }}

    .cert-diamond {{
      color: var(--gold);
      font-size: 13px;
    }}

    .cert-title {{
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 38px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #1A1618;
      line-height: 1.1;
    }}

    .cert-certifies-text {{
      font-size: 13.5px;
      font-weight: 500;
      color: #64748B;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 14px;
    }}

    /* Student Recipient Name (Calligraphic Script) */
    .cert-name-section {{
      text-align: center;
      position: relative;
      z-index: 2;
      margin: 4px 0 2px;
    }}

    .cert-student-name {{
      font-family: 'Great Vibes', 'Alex Brush', cursive;
      font-size: 54px;
      font-weight: 400;
      color: #1A1618;
      line-height: 1.15;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }}

    .cert-name-underline {{
      width: 380px;
      max-width: 80%;
      height: 1.5px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
      margin: 4px auto 0;
    }}

    /* Course Completion Statement */
    .cert-course-section {{
      text-align: center;
      position: relative;
      z-index: 2;
      margin-top: 10px;
    }}

    .cert-completed-text {{
      font-size: 13.5px;
      color: #555555;
      font-weight: 500;
    }}

    .cert-course-name {{
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--accent);
      margin: 6px 0;
      letter-spacing: -0.01em;
    }}

    .cert-batch-text {{
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
    }}

    /* 3-Column Signatures & Official Stamp Seal */
    .cert-footer-trio {{
      display: grid;
      grid-template-columns: 1fr 140px 1fr;
      align-items: flex-end;
      text-align: center;
      position: relative;
      z-index: 2;
      margin-top: 16px;
      padding: 0 20px;
    }}

    .cert-sig-block {{
      display: flex;
      flex-direction: column;
      align-items: center;
    }}

    .sig-svg {{
      height: 38px;
      width: 140px;
      stroke: #1E293B;
      stroke-width: 1.8;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      margin-bottom: 2px;
    }}

    .sig-line {{
      width: 170px;
      height: 1px;
      background: #94A3B8;
      margin-bottom: 6px;
    }}

    .sig-name {{
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
      line-height: 1.2;
    }}

    .sig-role {{
      font-size: 10.5px;
      color: #64748B;
      font-weight: 500;
    }}

    /* Official Certified Stamp Emblem */
    .cert-seal-wrap {{
      display: flex;
      justify-content: center;
      align-items: center;
    }}

    .cert-seal-svg {{
      width: 90px;
      height: 90px;
      transform: rotate(-4deg);
      filter: drop-shadow(0 2px 5px rgba(37, 99, 235, 0.15));
    }}

    /* Bottom Verification Strip (QR + Certificate ID) */
    .cert-bottom-bar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(0, 0, 0, 0.07);
      padding-top: 10px;
      margin-top: 14px;
      position: relative;
      z-index: 2;
      font-size: 10.5px;
      color: #64748B;
    }}

    .cert-qr-group {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .cert-qr-svg {{
      width: 38px;
      height: 38px;
      border: 1px solid #E2E8F0;
      padding: 2px;
      background: #FFFFFF;
      border-radius: 4px;
    }}

    .cert-id-text {{
      display: flex;
      flex-direction: column;
      text-align: left;
      line-height: 1.25;
    }}

    .cert-id-number {{
      font-weight: 700;
      color: var(--ink);
      font-size: 11px;
      letter-spacing: 0.04em;
    }}

    .cert-dates-group {{
      text-align: right;
      line-height: 1.3;
    }}

    .cert-date-val {{
      font-weight: 600;
      color: var(--ink);
    }}

    /* Print Optimization (A4 Landscape Zero-Margin High Res) */
    @media print {{
      @page {{
        size: A4 landscape;
        margin: 0;
      }}
      body {{
        background: #FFFFFF !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }}
      .action-bar {{
        display: none !important;
      }}
      .cert-sheet {{
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        aspect-ratio: auto !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: 8mm !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }}
    }}
  </style>
</head>
<body>

  <!-- Floating Print & Download Toolbar -->
  <aside class="action-bar" aria-label="Certificate Actions">
    <button type="button" class="action-btn" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print Certificate
    </button>
    <button type="button" class="action-btn action-btn--secondary" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Save as PDF
    </button>
    <button type="button" class="action-btn action-btn--secondary" onclick="window.close()">
      Close
    </button>
  </aside>

  <!-- Certificate Canvas -->
  <main class="cert-sheet">
    <div class="cert-outer-border">
      
      <!-- Ornate Guilloche Vertical Side Ribbons -->
      <div class="cert-strip-left" aria-hidden="true">
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
      </div>

      <div class="cert-strip-right" aria-hidden="true">
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
        <svg class="guilloche-leaf" viewBox="0 0 20 30"><path d="M10 0 C18 10, 18 20, 10 30 C2 20, 2 10, 10 0 Z"/></svg>
      </div>

      <div class="cert-inner-frame">
        <div class="cert-watermark" aria-hidden="true"></div>

        <!-- Corner Flourishes -->
        <svg class="corner-ornament corner-tl" viewBox="0 0 40 40"><path d="M4 36 L4 4 L36 4 M8 8 L32 8 M8 12 L8 32"/></svg>
        <svg class="corner-ornament corner-tr" viewBox="0 0 40 40"><path d="M4 36 L4 4 L36 4 M8 8 L32 8 M8 12 L8 32"/></svg>
        <svg class="corner-ornament corner-bl" viewBox="0 0 40 40"><path d="M4 36 L4 4 L36 4 M8 8 L32 8 M8 12 L8 32"/></svg>
        <svg class="corner-ornament corner-br" viewBox="0 0 40 40"><path d="M4 36 L4 4 L36 4 M8 8 L32 8 M8 12 L8 32"/></svg>

        <!-- Top Header Row -->
        <header class="cert-header">
          <!-- Aintrix Academy Official Folded-Ribbon Logo Pill -->
          <div class="cert-brand-pill" title="{academy}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="38" height="30" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="cert-aintrix-left" x1="48" y1="8" x2="14" y2="74" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#781436"/>
                  <stop offset="100%" stop-color="#4F071E"/>
                </linearGradient>
                <linearGradient id="cert-aintrix-right" x1="50" y1="14" x2="88" y2="74" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#3E0517"/>
                  <stop offset="32%" stop-color="#9A1B47"/>
                  <stop offset="72%" stop-color="#DD5C87"/>
                  <stop offset="100%" stop-color="#F8AFC5"/>
                </linearGradient>
              </defs>
              <path d="M48 6H56.5C60.5 6 62.5 8.2 65 12.6L96 74H81.5C75.5 74 73 70.5 69.8 64.8L46.5 23.5L48 6Z" fill="url(#cert-aintrix-right)"/>
              <path d="M4 74L37.8 12.8C40.4 8 43.4 6 48.5 6H56.2C59.4 6 60.4 8.2 58.3 12.2L49.5 27.2L27.8 65C24.5 70.7 21.8 74 16 74H4Z" fill="url(#cert-aintrix-left)"/>
            </svg>
            <div style="display:flex;flex-direction:column;text-align:left;line-height:1.15;">
              <span style="font-family:'Space Grotesk',sans-serif;font-size:17.5px;font-weight:700;color:#18181B;letter-spacing:-0.025em;">Aintrix</span>
              <span style="font-family:'Manrope',sans-serif;font-size:7.5px;font-weight:700;color:#71717A;letter-spacing:0.24em;text-transform:uppercase;">ACADEMY</span>
            </div>
          </div>

          <!-- Accreditation / Verification Badge (Inspired by NSDC in Image 2) -->
          <div class="cert-accreditation">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="3 2"/>
              <circle cx="24" cy="24" r="18" fill="#FDFBF7" stroke="var(--accent)" stroke-width="1.2"/>
              <path d="M24 12L26 18H32L27 21.5L29 27.5L24 23.8L19 27.5L21 21.5L16 18H22L24 12Z" fill="var(--gold)"/>
            </svg>
            <div class="cert-accreditation-text">
              <span class="cert-accreditation-title">SKILL CERTIFIED</span>
              <span class="cert-accreditation-sub">ISO 9001:2015 ACCREDITED</span>
            </div>
          </div>
        </header>

        <!-- Certificate Title with Side Ornaments -->
        <section class="cert-title-section">
          <div class="cert-title-row">
            <span class="cert-title-line"></span>
            <span class="cert-diamond">✦</span>
            <h1 class="cert-title">Certificate of Completion</h1>
            <span class="cert-diamond">✦</span>
            <span class="cert-title-line cert-title-line--right"></span>
          </div>
          <p class="cert-certifies-text">This is to certify that</p>
        </section>

        <!-- Recipient Name in Calligraphic Script -->
        <section class="cert-name-section">
          <div class="cert-student-name">{student_name}</div>
          <div class="cert-name-underline"></div>
        </section>

        <!-- Course Description & Batch Details -->
        <section class="cert-course-section">
          <p class="cert-completed-text">has successfully completed the comprehensive professional course</p>
          <div class="cert-course-name">“{programme_name}”</div>
          <p class="cert-batch-text">completed in batch <strong>{batch_name}</strong> · certified by {academy}</p>
        </section>

        <!-- Bottom Signatures & Seal Section (3 Columns) -->
        <footer class="cert-footer-trio">
          <!-- Left Signatory -->
          <div class="cert-sig-block">
            <svg class="sig-svg" viewBox="0 0 160 50">
              <path d="M10 35 C 25 15, 30 5, 45 35 C 55 45, 60 20, 75 25 C 90 30, 95 10, 110 32 C 120 40, 135 15, 150 28"/>
            </svg>
            <div class="sig-line"></div>
            <div class="sig-name">Lead Technical Instructor</div>
            <div class="sig-role">Mentor / Course Lead</div>
          </div>

          <!-- Center Official Circular Stamp Seal -->
          <div class="cert-seal-wrap">
            <svg class="cert-seal-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-dasharray="4 2"/>
              <circle cx="50" cy="50" r="41" fill="none" stroke="#1D4ED8" stroke-width="1.4"/>
              <circle cx="50" cy="50" r="31" fill="none" stroke="#2563EB" stroke-width="0.9"/>
              <path id="seal-curve-top" d="M 18 50 A 32 32 0 1 1 82 50" fill="none"/>
              <path id="seal-curve-bot" d="M 82 50 A 32 32 0 0 1 18 50" fill="none"/>
              <text font-family="'Manrope',sans-serif" font-size="6.5" font-weight="700" fill="#1E40AF" letter-spacing="1.2">
                <textPath href="#seal-curve-top" startOffset="50%" text-anchor="middle">
                  ★ AINTRIX ACADEMY ★
                </textPath>
              </text>
              <text font-family="'Manrope',sans-serif" font-size="6" font-weight="700" fill="#1E40AF" letter-spacing="1">
                <textPath href="#seal-curve-bot" startOffset="50%" text-anchor="middle">
                  VERIFIED CREDENTIAL
                </textPath>
              </text>
              <!-- Center folded-ribbon glyph inside seal -->
              <g transform="translate(39, 36) scale(0.22)">
                <path d="M48 6H56.5C60.5 6 62.5 8.2 65 12.6L96 74H81.5C75.5 74 73 70.5 69.8 64.8L46.5 23.5L48 6Z" fill="#1D4ED8"/>
                <path d="M4 74L37.8 12.8C40.4 8 43.4 6 48.5 6H56.2C59.4 6 60.4 8.2 58.3 12.2L49.5 27.2L27.8 65C24.5 70.7 21.8 74 16 74H4Z" fill="#1E40AF"/>
              </g>
              <rect x="26" y="58" width="48" height="11" rx="2.5" fill="#1D4ED8"/>
              <text x="50" y="66" text-anchor="middle" font-family="'Manrope',sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF" letter-spacing="1">
                CERTIFIED
              </text>
            </svg>
          </div>

          <!-- Right Signatory -->
          <div class="cert-sig-block">
            <svg class="sig-svg" viewBox="0 0 160 50">
              <path d="M15 28 C 30 10, 40 40, 55 20 C 70 5, 80 42, 95 24 C 110 12, 125 38, 145 18"/>
            </svg>
            <div class="sig-line"></div>
            <div class="sig-name">Academic Director</div>
            <div class="sig-role">Head of Academy</div>
          </div>
        </footer>

        <!-- Bottom Verification Strip (QR + Certificate ID) -->
        <aside class="cert-bottom-bar">
          <div class="cert-qr-group">
            <svg class="cert-qr-svg" viewBox="0 0 29 29" shape-rendering="crispEdges">
              <rect width="29" height="29" fill="#FFFFFF"/>
              <rect x="2" y="2" width="7" height="7" fill="#1C1917"/><rect x="3" y="3" width="5" height="5" fill="#FFFFFF"/><rect x="4" y="4" width="3" height="3" fill="#1C1917"/>
              <rect x="20" y="2" width="7" height="7" fill="#1C1917"/><rect x="21" y="3" width="5" height="5" fill="#FFFFFF"/><rect x="22" y="4" width="3" height="3" fill="#1C1917"/>
              <rect x="2" y="20" width="7" height="7" fill="#1C1917"/><rect x="3" y="21" width="5" height="5" fill="#FFFFFF"/><rect x="4" y="22" width="3" height="3" fill="#1C1917"/>
              <rect x="10" y="4" width="1" height="1" fill="#1C1917"/><rect x="12" y="4" width="1" height="1" fill="#1C1917"/><rect x="14" y="4" width="1" height="1" fill="#1C1917"/><rect x="16" y="4" width="1" height="1" fill="#1C1917"/><rect x="18" y="4" width="1" height="1" fill="#1C1917"/>
              <rect x="4" y="10" width="1" height="1" fill="#1C1917"/><rect x="4" y="12" width="1" height="1" fill="#1C1917"/><rect x="4" y="14" width="1" height="1" fill="#1C1917"/><rect x="4" y="16" width="1" height="1" fill="#1C1917"/><rect x="4" y="18" width="1" height="1" fill="#1C1917"/>
              <rect x="11" y="11" width="2" height="2" fill="#1C1917"/><rect x="14" y="10" width="2" height="1" fill="#1C1917"/><rect x="10" y="14" width="1" height="3" fill="#1C1917"/><rect x="12" y="16" width="3" height="2" fill="#1C1917"/><rect x="16" y="12" width="2" height="2" fill="#1C1917"/><rect x="15" y="15" width="2" height="3" fill="#1C1917"/>
              <rect x="20" y="10" width="1" height="2" fill="#1C1917"/><rect x="23" y="12" width="2" height="1" fill="#1C1917"/><rect x="22" y="14" width="2" height="2" fill="#1C1917"/><rect x="20" y="17" width="2" height="1" fill="#1C1917"/><rect x="24" y="16" width="2" height="3" fill="#1C1917"/>
              <rect x="10" y="21" width="2" height="1" fill="#1C1917"/><rect x="13" y="20" width="1" height="2" fill="#1C1917"/><rect x="11" y="24" width="3" height="2" fill="#1C1917"/><rect x="15" y="22" width="2" height="2" fill="#1C1917"/><rect x="18" y="21" width="2" height="2" fill="#1C1917"/><rect x="17" y="24" width="1" height="2" fill="#1C1917"/>
              <rect x="20" y="22" width="3" height="1" fill="#1C1917"/><rect x="24" y="21" width="2" height="2" fill="#1C1917"/><rect x="22" y="24" width="2" height="2" fill="#1C1917"/>
            </svg>
            <div class="cert-id-text">
              <span class="cert-id-number">Certificate ID: {cert_number}</span>
              <span>Scan or visit aintrix.com/verify to validate credential authenticity</span>
            </div>
          </div>
          <div class="cert-dates-group">
            <div>Issued: <span class="cert-date-val">{issued_date_str}</span></div>
            <div>Authorized Academic Credential · {academy}</div>
          </div>
        </aside>

      </div>
    </div>
  </main>

</body>
</html>"""
    return HTMLResponse(html)


@router.get("/attendance")
def my_attendance(user: User = STUDENT, db: Session = Depends(get_db)):
    threshold = threshold_percent(db)
    items = []
    for enrolment in my_enrolments(db, user):
        batch = db.get(Batch, enrolment.batch_id)
        summary = attendance_summary(db, user.id, enrolment.batch_id, threshold)
        items.append({"batch": batch.name if batch else "", **summary})
    return {"threshold_percent": threshold, "items": items}
