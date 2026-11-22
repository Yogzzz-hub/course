from datetime import date, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..deps import get_db, require_roles, roles_for
from ..errors import ApiError
from ..models import (
    Assignment,
    Batch,
    BatchTrainer,
    ClassSession,
    Enrolment,
    Programme,
    Quiz,
    QuizAttempt,
    Submission,
    Task,
    TaskCompletion,
    TrainerLeave,
    User,
)
from ..services import audit, class_attendance, threshold_percent
from ..timeutil import utcnow

router = APIRouter(prefix="/v1/trainer", tags=["trainer"])
TRAINER = Depends(require_roles("trainer"))


class QuestionIn(BaseModel):
    q: str = Field(min_length=3, max_length=500)
    options: list[str] = Field(min_length=2, max_length=6)
    answer_index: int = Field(ge=0)

    @field_validator("options")
    @classmethod
    def options_non_empty(cls, value: list[str]) -> list[str]:
        cleaned = [option.strip() for option in value]
        if any(not option or len(option) > 200 for option in cleaned):
            raise ValueError("Each option needs text, up to 200 characters.")
        return cleaned


class QuizIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    due_at: datetime | None = None
    questions: list[QuestionIn] = Field(min_length=1, max_length=100)


class AssignmentIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    brief: str = Field(default="", max_length=8000)
    due_at: datetime | None = None


class AssignmentUpdateIn(BaseModel):
    title: str | None = None
    brief: str | None = None
    due_at: datetime | None = None


class TaskIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    detail: str = Field(default="", max_length=4000)
    due_at: datetime | None = None
    user_id: int | None = None


class ClassLinksIn(BaseModel):
    meeting_url: str = Field(default="", max_length=500)
    recording_url: str = Field(default="", max_length=500)

    @field_validator("meeting_url", "recording_url")
    @classmethod
    def https_only(cls, value: str) -> str:
        value = value.strip()
        if value and not value.startswith(("https://", "http://")):
            raise ValueError("Paste a full link starting with https://")
        return value


class GradeIn(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str = Field(default="", max_length=4000)


def trainer_batch_ids(db: Session, user: User) -> list[int]:
    if "super_admin" in roles_for(db, user.id):
        return list(db.scalars(select(Batch.id)).all())
    return list(db.scalars(select(BatchTrainer.batch_id).where(BatchTrainer.user_id == user.id)).all())


def assert_batch_access(db: Session, user: User, batch_id: int) -> Batch:
    batch = db.get(Batch, batch_id)
    if batch is None or batch_id not in trainer_batch_ids(db, user):
        raise ApiError(404, "NOT_FOUND", "That batch could not be found on your timetable.")
    return batch


def assert_class_access(db: Session, user: User, class_id: int) -> ClassSession:
    cls = db.get(ClassSession, class_id)
    if cls is None or cls.batch_id not in trainer_batch_ids(db, user):
        raise ApiError(404, "NOT_FOUND", "That class could not be found on your timetable.")
    return cls


@router.get("/batches")
def my_batches(user: User = TRAINER, db: Session = Depends(get_db)):
    items = []
    for batch_id in trainer_batch_ids(db, user):
        batch = db.get(Batch, batch_id)
        if batch is None:
            continue
        programme = db.get(Programme, batch.programme_id)
        students = db.scalar(
            select(func.count(Enrolment.id)).where(Enrolment.batch_id == batch.id, Enrolment.status.in_(["active", "completed"]))
        ) or 0
        items.append(
            {
                "id": batch.id,
                "name": batch.name,
                "programme": programme.name if programme else "",
                "days": batch.days,
                "start_time": batch.start_time,
                "duration_minutes": batch.duration_minutes,
                "students": students,
            }
        )
    return {"items": items}


@router.get("/classes")
def my_classes(user: User = TRAINER, db: Session = Depends(get_db)):
    batch_ids = trainer_batch_ids(db, user)
    if not batch_ids:
        return {"items": []}
    rows = db.scalars(
        select(ClassSession).where(ClassSession.batch_id.in_(batch_ids)).order_by(ClassSession.starts_at).limit(500)
    ).all()
    items = []
    for cls in rows:
        batch = db.get(Batch, cls.batch_id)
        items.append(
            {
                "id": cls.id,
                "batch_id": cls.batch_id,
                "batch": batch.name if batch else "",
                "sequence": cls.sequence,
                "starts_at": cls.starts_at.isoformat() + "Z",
                "ends_at": cls.ends_at.isoformat() + "Z",
                "status": cls.status,
                "meeting_url": cls.meeting_url,
                "recording_url": cls.recording_url,
            }
        )
    return {"items": items}


class TrainerLeaveIn(BaseModel):
    batch_id: int | None = None
    class_id: int | None = None
    date: date
    reason: str = Field(min_length=3, max_length=1000)


@router.post("/classes/{class_id}/start")
def start_class(class_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    cls = assert_class_access(db, user, class_id)
    if cls.status == "ended":
        raise ApiError(409, "CLASS_ENDED", "This class has already ended.")
    if cls.status == "live":
        return {"ok": True}
    now = utcnow()
    seconds_until_start = (cls.starts_at - now).total_seconds()
    if seconds_until_start > 600:
        minutes_left = int((seconds_until_start + 59) // 60)
        raise ApiError(400, "TOO_EARLY", f"Classes can only be started 10 minutes prior to scheduled start time ({minutes_left} minutes remaining).")
    cls.status = "live"
    cls.started_at = now
    audit(db, user.id, "class.start", "class", cls.id)
    db.commit()
    return {"ok": True}


@router.get("/leaves")
def my_leaves(user: User = TRAINER, db: Session = Depends(get_db)):
    rows = db.scalars(
        select(TrainerLeave).where(TrainerLeave.trainer_id == user.id).order_by(TrainerLeave.created_at.desc())
    ).all()
    items = []
    for l in rows:
        batch = db.get(Batch, l.batch_id) if l.batch_id else None
        cls = db.get(ClassSession, l.class_id) if l.class_id else None
        items.append(
            {
                "id": l.id,
                "batch_id": l.batch_id,
                "batch": batch.name if batch else "General / All Batches",
                "class_id": l.class_id,
                "class_sequence": cls.sequence if cls else None,
                "date": l.date.isoformat(),
                "reason": l.reason,
                "status": l.status,
                "created_at": l.created_at.isoformat() + "Z",
                "decided_at": l.decided_at.isoformat() + "Z" if l.decided_at else None,
            }
        )
    return {"items": items}


@router.post("/leaves")
def request_leave(body: TrainerLeaveIn, user: User = TRAINER, db: Session = Depends(get_db)):
    leave = TrainerLeave(
        trainer_id=user.id,
        batch_id=body.batch_id,
        class_id=body.class_id,
        date=body.date,
        reason=body.reason.strip(),
        status="pending",
    )
    db.add(leave)
    db.flush()
    audit(db, user.id, "trainer.leave_request", "trainer_leave", leave.id, {"date": str(body.date), "reason": body.reason})
    db.commit()
    return {"ok": True, "id": leave.id}


@router.post("/classes/{class_id}/end")
def end_class(class_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    cls = assert_class_access(db, user, class_id)
    if cls.status != "live":
        raise ApiError(409, "CLASS_NOT_LIVE", "Start the class before you end it.")
    cls.status = "ended"
    cls.ended_at = utcnow()
    audit(db, user.id, "class.end", "class", cls.id)
    db.commit()
    return {"ok": True}


@router.patch("/classes/{class_id}")
def update_links(class_id: int, body: ClassLinksIn, user: User = TRAINER, db: Session = Depends(get_db)):
    cls = assert_class_access(db, user, class_id)
    cls.meeting_url = body.meeting_url
    cls.recording_url = body.recording_url
    audit(db, user.id, "class.links", "class", cls.id)
    db.commit()
    return {"ok": True}


@router.get("/classes/{class_id}/roster")
def roster(class_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    """Who is connected and for how long. Read-only: attendance is recorded from the student's connection, not by the trainer."""
    cls = assert_class_access(db, user, class_id)
    threshold = threshold_percent(db)
    rows = []
    for enrolment in db.scalars(
        select(Enrolment).where(Enrolment.batch_id == cls.batch_id, Enrolment.status.in_(["active", "completed"]))
    ).all():
        student = db.get(User, enrolment.user_id)
        attendance = class_attendance(db, cls, enrolment.user_id, threshold)
        rows.append(
            {
                "name": student.name if student else "",
                "email": student.email if student else "",
                "minutes_connected": round(attendance["seconds"] / 60),
                "percent": attendance["percent"],
                "attended": attendance["attended"],
            }
        )
    return {"threshold_percent": threshold, "items": rows}


@router.get("/batches/{batch_id}/assignments")
def list_assignments(batch_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    assert_batch_access(db, user, batch_id)
    rows = db.scalars(select(Assignment).where(Assignment.batch_id == batch_id).order_by(Assignment.created_at.desc())).all()
    items = []
    for assignment in rows:
        submissions = db.scalar(select(func.count(Submission.id)).where(Submission.assignment_id == assignment.id)) or 0
        graded = db.scalar(
            select(func.count(Submission.id)).where(Submission.assignment_id == assignment.id, Submission.score.is_not(None))
        ) or 0
        items.append(
            {
                "id": assignment.id,
                "title": assignment.title,
                "brief": assignment.brief,
                "due_at": assignment.due_at.isoformat() + "Z" if assignment.due_at else None,
                "submissions": submissions,
                "graded": graded,
            }
        )
    return {"items": items}


@router.post("/batches/{batch_id}/assignments")
def create_assignment(batch_id: int, body: AssignmentIn, user: User = TRAINER, db: Session = Depends(get_db)):
    assert_batch_access(db, user, batch_id)
    assignment = Assignment(batch_id=batch_id, title=body.title.strip(), brief=body.brief, due_at=body.due_at, created_by=user.id)
    db.add(assignment)
    db.flush()
    audit(db, user.id, "assignment.create", "assignment", assignment.id, {"batch_id": batch_id})
    db.commit()
    return {"id": assignment.id}


@router.patch("/assignments/{assignment_id}")
def update_assignment(assignment_id: int, body: AssignmentUpdateIn, user: User = TRAINER, db: Session = Depends(get_db)):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise ApiError(404, "NOT_FOUND", "That assignment could not be found.")
    assert_batch_access(db, user, assignment.batch_id)
    if body.title is not None:
        assignment.title = body.title.strip()
    if body.brief is not None:
        assignment.brief = body.brief
    if "due_at" in body.model_fields_set:
        assignment.due_at = body.due_at
    audit(db, user.id, "assignment.update", "assignment", assignment.id, {"due_at": str(assignment.due_at)})
    db.commit()
    return {
        "id": assignment.id,
        "title": assignment.title,
        "brief": assignment.brief,
        "due_at": assignment.due_at.isoformat() + "Z" if assignment.due_at else None,
    }


@router.get("/assignments/{assignment_id}/submissions")
def list_submissions(assignment_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise ApiError(404, "NOT_FOUND", "That assignment could not be found.")
    assert_batch_access(db, user, assignment.batch_id)
    rows = db.scalars(select(Submission).where(Submission.assignment_id == assignment_id).order_by(Submission.submitted_at)).all()
    items = []
    for sub in rows:
        student = db.get(User, sub.user_id)
        items.append(
            {
                "id": sub.id,
                "name": student.name if student else "",
                "email": student.email if student else "",
                "kind": sub.kind,
                "link": sub.link,
                "file_name": sub.file_name,
                "has_file": bool(sub.file_path),
                "note": sub.note,
                "submitted_at": sub.submitted_at.isoformat() + "Z",
                "score": sub.score,
                "feedback": sub.feedback,
            }
        )
    return {"items": items}


@router.get("/submissions/{submission_id}/file")
def download_submission(submission_id: int, inline: bool = False, user: User = TRAINER, db: Session = Depends(get_db)):
    sub = db.get(Submission, submission_id)
    if sub is None or not sub.file_path:
        raise ApiError(404, "NOT_FOUND", "There is no file for this submission.")
    assignment = db.get(Assignment, sub.assignment_id)
    assert_batch_access(db, user, assignment.batch_id)
    import mimetypes
    media_type, _ = mimetypes.guess_type(sub.file_name)
    disp = "inline" if inline else "attachment"
    return FileResponse(
        sub.file_path,
        media_type=media_type or "application/octet-stream",
        content_disposition_type=disp,
        filename=sub.file_name,
    )


@router.patch("/submissions/{submission_id}")
def grade_submission(submission_id: int, body: GradeIn, user: User = TRAINER, db: Session = Depends(get_db)):
    sub = db.get(Submission, submission_id)
    if sub is None:
        raise ApiError(404, "NOT_FOUND", "That submission could not be found.")
    assignment = db.get(Assignment, sub.assignment_id)
    assert_batch_access(db, user, assignment.batch_id)
    sub.score = body.score
    sub.feedback = body.feedback
    sub.graded_by = user.id
    sub.graded_at = utcnow()
    audit(db, user.id, "submission.grade", "submission", sub.id, {"score": body.score})
    db.commit()
    return {"ok": True}


@router.post("/batches/{batch_id}/quizzes")
def create_quiz(batch_id: int, body: QuizIn, user: User = TRAINER, db: Session = Depends(get_db)):
    assert_batch_access(db, user, batch_id)
    for index, question in enumerate(body.questions, start=1):
        if question.answer_index >= len(question.options):
            raise ApiError(422, "VALIDATION", f"Question {index}: the correct answer must be one of its options.")
    quiz = Quiz(
        batch_id=batch_id,
        title=body.title.strip(),
        questions=[q.model_dump() for q in body.questions],
        due_at=body.due_at,
        created_by=user.id,
    )
    db.add(quiz)
    db.flush()
    audit(db, user.id, "quiz.create", "quiz", quiz.id, {"batch_id": batch_id})
    db.commit()
    return {"id": quiz.id}


@router.get("/batches/{batch_id}/quizzes")
def list_quizzes(batch_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    assert_batch_access(db, user, batch_id)
    rows = db.scalars(select(Quiz).where(Quiz.batch_id == batch_id).order_by(Quiz.created_at.desc())).all()
    items = []
    for quiz in rows:
        attempts = db.scalar(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz.id)) or 0
        items.append({"id": quiz.id, "title": quiz.title, "questions": len(quiz.questions), "attempts": attempts})
    return {"items": items}


@router.get("/quizzes/{quiz_id}/attempts")
def quiz_attempts(quiz_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if quiz is None:
        raise ApiError(404, "NOT_FOUND", "That quiz could not be found.")
    assert_batch_access(db, user, quiz.batch_id)
    rows = db.scalars(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id).order_by(QuizAttempt.submitted_at)).all()
    items = []
    for attempt in rows:
        student = db.get(User, attempt.user_id)
        items.append(
            {
                "name": student.name if student else "",
                "email": student.email if student else "",
                "score": attempt.score,
                "total": attempt.total,
                "submitted_at": attempt.submitted_at.isoformat() + "Z",
            }
        )
    return {"title": quiz.title, "items": items}


@router.post("/batches/{batch_id}/tasks")
def create_task(batch_id: int, body: TaskIn, user: User = TRAINER, db: Session = Depends(get_db)):
    assert_batch_access(db, user, batch_id)
    if body.user_id is not None:
        enrolled = db.scalar(
            select(Enrolment.id).where(Enrolment.batch_id == batch_id, Enrolment.user_id == body.user_id)
        )
        if enrolled is None:
            raise ApiError(422, "VALIDATION", "That student is not in this batch.", {"user_id": "Not in this batch."})
    task = Task(
        batch_id=batch_id,
        user_id=body.user_id,
        title=body.title.strip(),
        detail=body.detail,
        due_at=body.due_at,
        created_by=user.id,
    )
    db.add(task)
    db.flush()
    audit(db, user.id, "task.create", "task", task.id, {"batch_id": batch_id})
    db.commit()
    return {"id": task.id}


@router.get("/batches/{batch_id}/tasks")
def list_tasks(batch_id: int, user: User = TRAINER, db: Session = Depends(get_db)):
    assert_batch_access(db, user, batch_id)
    rows = db.scalars(select(Task).where(Task.batch_id == batch_id).order_by(Task.created_at.desc())).all()
    items = []
    for task in rows:
        done = db.scalar(select(func.count(TaskCompletion.id)).where(TaskCompletion.task_id == task.id)) or 0
        target = db.get(User, task.user_id) if task.user_id else None
        items.append(
            {
                "id": task.id,
                "title": task.title,
                "detail": task.detail,
                "due_at": task.due_at.isoformat() + "Z" if task.due_at else None,
                "for": target.name if target else "Whole batch",
                "done": done,
            }
        )
    return {"items": items}
