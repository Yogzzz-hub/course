import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..deps import get_db, require_roles
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


@router.get("/payments")
def my_payments(user: User = STUDENT, db: Session = Depends(get_db)):
    rows = db.scalars(select(Payment).where(Payment.user_id == user.id).order_by(Payment.submitted_at.desc())).all()
    return {
        "items": [
            {
                "id": p.id,
                "amount_inr": p.amount_inr,
                "method": p.method,
                "reference": p.reference,
                "paid_on": p.paid_on.isoformat(),
                "status": p.status,
                "note": p.note,
            }
            for p in rows
        ]
    }


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
                        "kind": sub.kind,
                        "link": sub.link,
                        "file_name": sub.file_name,
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
        items.append(
            {
                "id": quiz.id,
                "title": quiz.title,
                "due_at": quiz.due_at.isoformat() + "Z" if quiz.due_at else None,
                # Questions are sent without answers; the answer key never leaves the server.
                "questions": [{"q": q["q"], "options": q["options"]} for q in quiz.questions],
                "attempt": {"score": attempt.score, "total": attempt.total} if attempt else None,
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


@router.get("/certificates")
def certificates(user: User = STUDENT, db: Session = Depends(get_db)):
    items = []
    for enrolment in my_enrolments(db, user):
        for cert in db.scalars(select(Certificate).where(Certificate.enrolment_id == enrolment.id, Certificate.revoked.is_(False))).all():
            batch = db.get(Batch, enrolment.batch_id)
            programme = db.get(Programme, enrolment.programme_id)
            items.append(
                {
                    "id": cert.id,
                    "number": cert.number,
                    "programme": programme.name if programme else "",
                    "batch": batch.name if batch else "",
                    "issued_at": cert.issued_at.isoformat() + "Z",
                }
            )
    return {"items": items}


@router.get("/certificates/{certificate_id}", response_class=HTMLResponse)
def certificate_view(certificate_id: int, user: User = STUDENT, db: Session = Depends(get_db)):
    cert = db.get(Certificate, certificate_id)
    if cert is None or cert.revoked:
        raise ApiError(404, "NOT_FOUND", "That certificate could not be found.")
    enrolment = db.get(Enrolment, cert.enrolment_id)
    if enrolment is None or enrolment.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", "That certificate could not be found.")
    student = db.get(User, user.id)
    batch = db.get(Batch, enrolment.batch_id)
    programme = db.get(Programme, enrolment.programme_id)
    academy = get_setting(db, "academy_name", "Aintrix Academy")
    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>Certificate {cert.number}</title>
<style>body{{font-family:Georgia,serif;text-align:center;padding:60px;color:#241921}}
.frame{{border:6px double #681C35;padding:50px}}h1{{color:#681C35}}.name{{font-size:36px;margin:24px 0}}</style></head>
<body><div class="frame"><p>{academy}</p><h1>Certificate of Completion</h1><p>This certifies that</p>
<div class="name">{student.name}</div><p>has completed <strong>{programme.name if programme else ''}</strong>
in the batch <strong>{batch.name if batch else ''}</strong>.</p>
<p>Certificate number {cert.number} · Issued {cert.issued_at.date().isoformat()}</p></div></body></html>"""
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
