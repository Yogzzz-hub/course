from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..deps import get_db, require_roles
from ..errors import ApiError
from ..models import Batch, Enrolment, Expense, Payment, Programme, User
from ..services import audit, fee_summary, verified_total
from ..timeutil import utcnow

router = APIRouter(prefix="/v1/finance", tags=["finance"])
FINANCE = Depends(require_roles("financier"))


class DecisionIn(BaseModel):
    note: str = Field(default="", max_length=1000)


class ExpenseIn(BaseModel):
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=2000)
    amount_inr: int = Field(gt=0, le=100_000_000)
    spent_on: date


def get_payment(db: Session, payment_id: int) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise ApiError(404, "NOT_FOUND", "That payment could not be found.")
    return payment


@router.get("/overview")
def overview(_: User = FINANCE, db: Session = Depends(get_db)):
    enrolments = db.scalars(select(Enrolment).where(Enrolment.status != "dropped")).all()
    fees_total = sum(e.fee_total_inr for e in enrolments)
    outstanding = sum(fee_summary(db, e)["balance_inr"] for e in enrolments)
    income = db.scalar(select(func.coalesce(func.sum(Payment.amount_inr), 0)).where(Payment.status == "verified")) or 0
    expenses = db.scalar(select(func.coalesce(func.sum(Expense.amount_inr), 0))) or 0
    pending = db.scalar(select(func.count(Payment.id)).where(Payment.status == "submitted")) or 0
    return {
        "fees_total_inr": fees_total,
        "income_inr": int(income),
        "expenses_inr": int(expenses),
        "net_inr": int(income) - int(expenses),
        "outstanding_inr": outstanding,
        "payments_to_verify": pending,
    }


@router.get("/payments")
def list_payments(status: Literal["submitted", "verified", "rejected", "all"] = "submitted", _: User = FINANCE, db: Session = Depends(get_db)):
    query = select(Payment).order_by(Payment.submitted_at.desc())
    if status != "all":
        query = query.where(Payment.status == status)
    items = []
    for payment in db.scalars(query).all():
        enrolment = db.get(Enrolment, payment.enrolment_id)
        student = db.get(User, payment.user_id)
        batch = db.get(Batch, enrolment.batch_id) if enrolment else None
        fees = fee_summary(db, enrolment) if enrolment else None
        items.append(
            {
                "id": payment.id,
                "name": student.name if student else "",
                "email": student.email if student else "",
                "batch": batch.name if batch else "",
                "amount_inr": payment.amount_inr,
                "method": payment.method,
                "reference": payment.reference,
                "paid_on": payment.paid_on.isoformat(),
                "status": payment.status,
                "note": payment.note,
                "fee_total_inr": fees["fee_total_inr"] if fees else None,
                "paid_inr": fees["paid_inr"] if fees else None,
                "balance_inr": fees["balance_inr"] if fees else None,
            }
        )
    return {"items": items}


@router.post("/payments/{payment_id}/verify")
def verify_payment(payment_id: int, body: DecisionIn, user: User = FINANCE, db: Session = Depends(get_db)):
    payment = get_payment(db, payment_id)
    if payment.status != "submitted":
        raise ApiError(409, "ALREADY_DECIDED", "This payment has already been decided.")
    payment.status = "verified"
    payment.note = body.note
    payment.decided_by = user.id
    payment.decided_at = utcnow()
    db.flush()  # make the new verified status visible to the total below
    enrolment = db.get(Enrolment, payment.enrolment_id)
    if enrolment is not None and enrolment.status == "awaiting_payment" and verified_total(db, enrolment.id) > 0:
        enrolment.status = "active"
    audit(db, user.id, "payment.verify", "payment", payment.id, {"amount_inr": payment.amount_inr})
    db.commit()
    return {"ok": True}


@router.post("/payments/{payment_id}/reject")
def reject_payment(payment_id: int, body: DecisionIn, user: User = FINANCE, db: Session = Depends(get_db)):
    payment = get_payment(db, payment_id)
    if payment.status != "submitted":
        raise ApiError(409, "ALREADY_DECIDED", "This payment has already been decided.")
    if not body.note.strip():
        raise ApiError(422, "VALIDATION", "Tell the student why this payment was rejected.", {"note": "A reason is required."})
    payment.status = "rejected"
    payment.note = body.note.strip()
    payment.decided_by = user.id
    payment.decided_at = utcnow()
    audit(db, user.id, "payment.reject", "payment", payment.id, {"amount_inr": payment.amount_inr})
    db.commit()
    return {"ok": True}


@router.get("/expenses")
def list_expenses(_: User = FINANCE, db: Session = Depends(get_db)):
    rows = db.scalars(select(Expense).order_by(Expense.spent_on.desc())).all()
    return {
        "items": [
            {"id": e.id, "category": e.category, "description": e.description, "amount_inr": e.amount_inr, "spent_on": e.spent_on.isoformat()}
            for e in rows
        ]
    }


@router.post("/expenses")
def create_expense(body: ExpenseIn, user: User = FINANCE, db: Session = Depends(get_db)):
    expense = Expense(
        category=body.category.strip(),
        description=body.description.strip(),
        amount_inr=body.amount_inr,
        spent_on=body.spent_on,
        recorded_by=user.id,
    )
    db.add(expense)
    db.flush()
    audit(db, user.id, "expense.create", "expense", expense.id, {"amount_inr": expense.amount_inr})
    db.commit()
    return {"id": expense.id}


@router.get("/ledger")
def ledger(_: User = FINANCE, db: Session = Depends(get_db)):
    """Income (verified student payments) and outflow (expenses) in date order, with a running balance."""
    rows: list[dict] = []
    for payment in db.scalars(select(Payment).where(Payment.status == "verified")).all():
        student = db.get(User, payment.user_id)
        rows.append({"date": payment.paid_on, "kind": "income", "description": f"Fee: {student.name if student else 'student'} ({payment.method})", "amount_inr": payment.amount_inr})
    for expense in db.scalars(select(Expense)).all():
        rows.append({"date": expense.spent_on, "kind": "outflow", "description": f"{expense.category}: {expense.description}".rstrip(": "), "amount_inr": expense.amount_inr})
    rows.sort(key=lambda row: row["date"])
    balance = 0
    items = []
    for row in rows:
        balance += row["amount_inr"] if row["kind"] == "income" else -row["amount_inr"]
        items.append({**row, "date": row["date"].isoformat(), "balance_inr": balance})
    return {"items": items}
