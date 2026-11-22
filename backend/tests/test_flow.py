import os
import tempfile
from datetime import date, datetime, timedelta

_tmp = tempfile.mkdtemp(prefix="academy-test-")
os.environ.update(
    APP_ENV="development",
    DATABASE_URL=f"sqlite:///{_tmp}/test.db",
    UPLOAD_DIR=f"{_tmp}/uploads",
    COOKIE_SECURE="false",
)

from sqlalchemy import select
from fastapi.testclient import TestClient  # noqa: E402

from app.db import SessionLocal, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import ClassSession, Presence  # noqa: E402

init_db()


def client_as(role: str) -> TestClient:
    client = TestClient(app)
    r = client.post("/v1/dev/login-as", json={"role": role})
    assert r.status_code == 200, r.text
    return client


def write(client: TestClient, method: str, path: str, **kwargs):
    headers = {"X-CSRF-Token": client.cookies.get("academy_csrf", "")}
    return getattr(client, method)(path, headers=headers, **kwargs)


def test_full_flow():
    manager = client_as("manager")
    assert manager.get("/v1/me").json()["roles"] == ["manager"]

    # Manager creates a programme and a batch; classes are generated from the schedule.
    prog = write(manager, "post", "/v1/manager/programmes", json={"name": "Python Full Stack", "fee_inr": 20000, "duration_weeks": 12}).json()
    batch = write(manager, "post", "/v1/manager/batches", json={
        "programme_id": prog["id"], "name": "Batch A", "start_date": "2027-01-04", "days": ["Mon", "Wed"],
        "start_time": "19:00", "duration_minutes": 90, "classes_total": 4, "capacity": 10,
    }).json()
    assert batch["classes_created"] == 4

    # Trainer is assigned to the batch.
    trainer_id = client_as("trainer").get("/v1/me").json()["id"]
    assert write(manager, "post", f"/v1/manager/batches/{batch['id']}/trainers", json={"user_id": trainer_id}).status_code == 200
    trainer = client_as("trainer")
    assert len(trainer.get("/v1/trainer/batches").json()["items"]) == 1
    classes = trainer.get("/v1/trainer/classes").json()["items"]
    assert len(classes) == 4

    # Manager onboards a student and gets a one-time password.
    onboard = write(manager, "post", "/v1/manager/students", json={"name": "Asha Rao", "email": "asha@example.com", "phone": "", "batch_id": batch["id"]})
    assert onboard.status_code == 200, onboard.text
    temp = onboard.json()["temporary_password"]
    enrolment_id = onboard.json()["enrolment_id"]

    student = TestClient(app)
    assert student.post("/v1/auth/login", json={"email": "asha@example.com", "password": temp}).status_code == 200
    overview = student.get("/v1/student/overview").json()["items"][0]
    assert overview["status"] == "awaiting_payment"
    assert overview["fees"]["balance_inr"] == 20000
    assert student.get("/v1/student/classes").json()["items"][0]["access"] is False

    # Before payment the student cannot join a class.
    cls_id = classes[0]["id"]
    # Trying to start a scheduled future class (> 10m away) is refused
    early = write(trainer, "post", f"/v1/trainer/classes/{cls_id}/start")
    assert early.status_code == 400
    assert early.json()["error"]["code"] == "TOO_EARLY"

    # Manager reschedules class to now so it is within 10 minutes of start
    from app.timeutil import utcnow
    assert write(manager, "patch", f"/v1/manager/classes/{cls_id}/reschedule", json={"starts_at": utcnow().isoformat() + "Z"}).status_code == 200

    trainer_start = write(trainer, "post", f"/v1/trainer/classes/{cls_id}/start")
    assert trainer_start.status_code == 200
    assert write(student, "post", f"/v1/student/classes/{cls_id}/presence").status_code == 403

    # Student submits a payment; finance verifies it; access opens.
    pay = write(student, "post", "/v1/student/payments", json={
        "enrolment_id": enrolment_id, "amount_inr": 20000, "method": "UPI", "reference": "UTR123456", "paid_on": "2027-01-02",
    })
    assert pay.status_code == 200, pay.text
    finance = client_as("financier")
    pending = finance.get("/v1/finance/payments?status=submitted").json()["items"]
    assert pending and pending[0]["reference"] == "UTR123456"
    assert write(finance, "post", f"/v1/finance/payments/{pending[0]['id']}/verify", json={"note": ""}).status_code == 200
    assert student.get("/v1/student/overview").json()["items"][0]["status"] == "active"

    # Live class: student heartbeat is accepted; trainer cannot edit attendance (no such route) and only ends the class.
    hb = write(student, "post", f"/v1/student/classes/{cls_id}/presence")
    assert hb.status_code == 200, hb.text
    assert write(trainer, "patch", f"/v1/trainer/classes/{cls_id}", json={"meeting_url": "https://meet.example.com/x", "recording_url": ""}).status_code == 200

    # Simulate attended time for each class using the stored presence (the heartbeat cap prevents waiting in a test).
    with SessionLocal() as db:
        student_id = student.get("/v1/me").json()["id"]
        for cls in db.query(ClassSession).filter(ClassSession.batch_id == batch["id"]).all():
            full = int((cls.ends_at - cls.starts_at).total_seconds())
            row = db.query(Presence).filter_by(class_id=cls.id, user_id=student_id).first()
            if row is None:
                db.add(Presence(class_id=cls.id, user_id=student_id, first_seen=datetime.utcnow(), last_seen=datetime.utcnow(), seconds=full))
            else:
                row.seconds = full
        db.commit()

    for c in classes:
        write(manager, "patch", f"/v1/manager/classes/{c['id']}/reschedule", json={"starts_at": utcnow().isoformat() + "Z"})
        assert write(trainer, "post", f"/v1/trainer/classes/{c['id']}/start").status_code == 200
        assert write(trainer, "post", f"/v1/trainer/classes/{c['id']}/end").status_code == 200
    ended = trainer.get("/v1/trainer/classes").json()["items"]
    assert all(c["status"] == "ended" for c in ended)
    roster = trainer.get(f"/v1/trainer/classes/{cls_id}/roster").json()["items"]
    assert roster and roster[0]["attended"] is True

    # Assignment: trainer creates, student submits a Git link, trainer grades.
    assignment = write(trainer, "post", f"/v1/trainer/batches/{batch['id']}/assignments", json={"title": "Flask API", "brief": "Build it"}).json()
    sub = write(student, "post", f"/v1/student/assignments/{assignment['id']}/submit", data={"kind": "git", "link": "https://github.com/asha/flask-api"})
    assert sub.status_code == 200, sub.text
    subs = trainer.get(f"/v1/trainer/assignments/{assignment['id']}/submissions").json()["items"]
    assert subs[0]["link"].startswith("https://github.com")
    assert write(trainer, "patch", f"/v1/trainer/submissions/{subs[0]['id']}", json={"score": 82, "feedback": "Good"}).status_code == 200

    # Quiz: answer key stays on the server.
    quiz = write(trainer, "post", f"/v1/trainer/batches/{batch['id']}/quizzes", json={
        "title": "Basics", "questions": [{"q": "2+2?", "options": ["3", "4"], "answer_index": 1}],
    }).json()
    listed = student.get("/v1/student/quizzes").json()["items"][0]
    assert "answer_index" not in str(listed)
    attempt = write(student, "post", f"/v1/student/quizzes/{quiz['id']}/attempt", json={"answers": [1]}).json()
    assert attempt == {"score": 1, "total": 1}

    # Fees: cleared in full already? Balance is 0 after one full payment. Certificate eligibility then issuance by manager.
    elig = write(manager, "get", f"/v1/manager/certificates/eligibility?batch_id={batch['id']}").json()["items"][0]
    assert elig["checks"]["attendance_ok"] and elig["checks"]["fees_cleared"] and elig["checks"]["all_classes_ended"]
    issued = write(manager, "post", f"/v1/manager/enrolments/{enrolment_id}/certificate").json()
    assert issued["number"].startswith("AIN-")
    certs = student.get("/v1/student/certificates").json()["items"]
    assert certs and certs[0]["number"] == issued["number"]
    html = student.get(f"/v1/student/certificates/{certs[0]['id']}").text
    assert "Asha Rao" in html

    # Finance ledger and overview reflect the verified payment.
    assert finance.get("/v1/finance/overview").json()["income_inr"] == 20000
    assert finance.get("/v1/finance/ledger").json()["items"][0]["kind"] == "income"


def test_csrf_and_role_guards():
    anon = TestClient(app)
    assert anon.get("/v1/me").status_code == 401
    student = client_as("student")
    # State-changing call without the CSRF header is refused.
    refused = student.post("/v1/student/payments", json={"enrolment_id": 1, "amount_inr": 1, "method": "UPI", "reference": "abc", "paid_on": "2027-01-01"})
    assert refused.status_code == 403
    # A student cannot open the manager area.
    assert student.get("/v1/manager/overview").status_code == 403


def test_super_admin_guards_and_settings():
    sa = client_as("super_admin")
    settings = sa.get("/v1/superadmin/settings").json()
    assert settings["attendance_threshold_percent"] == 60
    saved = write(sa, "put", "/v1/superadmin/settings", json={
        "attendance_threshold_percent": 80, "require_fees_cleared": True, "academy_name": "Aintrix Academy", "payment_instructions": "",
    })
    assert saved.status_code == 200
    assert sa.get("/v1/superadmin/settings").json()["attendance_threshold_percent"] == 80
    # Admin cannot grant super admin.
    admin = client_as("admin")
    denied = write(admin, "post", "/v1/admin/users", json={"name": "Someone", "email": "x@example.com", "roles": ["super_admin"]})
    assert denied.status_code == 403


def test_leaves_reschedule_recording():
    manager = client_as("manager")
    trainer = client_as("trainer")

    # Trainer submits leave request
    leave_req = write(trainer, "post", "/v1/trainer/leaves", json={
        "date": "2027-02-15",
        "reason": "Personal medical leave. Please reschedule.",
    })
    assert leave_req.status_code == 200
    leave_id = leave_req.json()["id"]

    # Trainer sees their leave
    my_leaves = trainer.get("/v1/trainer/leaves").json()["items"]
    assert any(l["id"] == leave_id and l["status"] == "pending" for l in my_leaves)

    # Manager sees leave request
    manager_leaves = manager.get("/v1/manager/leaves").json()["items"]
    assert any(l["id"] == leave_id and l["status"] == "pending" for l in manager_leaves)

    # Manager approves leave
    assert write(manager, "post", f"/v1/manager/leaves/{leave_id}/approve").status_code == 200
    updated_leave = [l for l in manager.get("/v1/manager/leaves").json()["items"] if l["id"] == leave_id][0]
    assert updated_leave["status"] == "approved"

    # Manager reschedules a class
    # Get a class session from the database
    with SessionLocal() as db:
        cls = db.scalar(select(ClassSession))
        cls_id = cls.id if cls else None

    if cls_id:
        resched = write(manager, "patch", f"/v1/manager/classes/{cls_id}/reschedule", json={
            "starts_at": "2027-02-16T18:00:00Z",
            "duration_minutes": 60,
        })
        assert resched.status_code == 200

        # Manager updates class recording
        rec = write(manager, "patch", f"/v1/manager/classes/{cls_id}/recording", json={
            "recording_url": "https://meet.google.com/recording/xyz-123",
        })
        assert rec.status_code == 200

