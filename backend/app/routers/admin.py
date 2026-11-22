from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..deps import ROLES, get_db, require_roles, roles_for
from ..errors import ApiError
from ..models import AuditLog, Batch, Enrolment, Payment, User, UserRole
from ..security import hash_password, temporary_password, token_digest
from ..services import audit, get_setting, set_setting, threshold_percent, fees_must_clear
from ..config import get_settings
from .auth import IMPERSONATOR_COOKIE, home_for, start_session

router = APIRouter(prefix="/v1", tags=["admin"])
ADMIN = Depends(require_roles("admin"))
SUPER = Depends(require_roles("super_admin"))

STAFF_ROLES = ("student", "trainer", "manager", "financier", "admin")


class UserIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=190)
    phone: str = Field(default="", max_length=30)
    roles: list[str] = Field(min_length=1, max_length=5)


class UserStatusIn(BaseModel):
    status: Literal["active", "disabled"]


class RolesIn(BaseModel):
    roles: list[str] = Field(min_length=1, max_length=6)


class SettingsIn(BaseModel):
    attendance_threshold_percent: int = Field(ge=1, le=100)
    require_fees_cleared: bool
    academy_name: str = Field(min_length=2, max_length=120)
    payment_instructions: str = Field(default="", max_length=2000)


def check_roles(requested: list[str], allow_super: bool) -> list[str]:
    allowed = ROLES if allow_super else STAFF_ROLES
    unknown = [role for role in requested if role not in ROLES]
    if unknown:
        raise ApiError(422, "VALIDATION", "Choose valid roles.", {"roles": "Unknown role."})
    if not allow_super and "super_admin" in requested:
        raise ApiError(403, "SUPER_ADMIN_ONLY", "Only the super admin can grant the super admin role.")
    return sorted(set(requested))


def user_roles(db: Session, user_id: int) -> list[str]:
    return sorted(roles_for(db, user_id))


def user_row(db: Session, user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "phone": user.phone, "status": user.status, "roles": user_roles(db, user.id)}


# ---- admin ---------------------------------------------------------------------------------------

@router.get("/admin/overview")
def admin_overview(_: User = ADMIN, db: Session = Depends(get_db)):
    counts = {role: db.scalar(select(func.count(UserRole.id)).where(UserRole.role == role)) or 0 for role in ROLES}
    enrolments = {
        status: db.scalar(select(func.count(Enrolment.id)).where(Enrolment.status == status)) or 0
        for status in ("awaiting_payment", "active", "completed", "dropped")
    }
    return {"users_by_role": counts, "enrolments_by_status": enrolments, "batches": db.scalar(select(func.count(Batch.id))) or 0}


@router.get("/admin/users")
def list_users(role: str | None = None, q: str | None = None, _: User = ADMIN, db: Session = Depends(get_db)):
    query = select(User).order_by(User.name)
    if role:
        query = select(User).join(UserRole, UserRole.user_id == User.id).where(UserRole.role == role).order_by(User.name)
    if q:
        term = f"%{q.strip().lower()}%"
        query = query.where(func.lower(User.email).like(term) | func.lower(User.name).like(term))
    users = db.scalars(query).all()
    return {"items": [user_row(db, u) for u in users]}


@router.post("/admin/users")
def create_user(body: UserIn, actor: User = ADMIN, db: Session = Depends(get_db)):
    roles = check_roles(body.roles, allow_super=False)
    email = body.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise ApiError(409, "EMAIL_EXISTS", "An account with this email already exists.", {"email": "This email already has an account."})
    password = temporary_password()
    user = User(name=body.name.strip(), email=email, phone=body.phone.strip(), password_hash=hash_password(password))
    db.add(user)
    db.flush()
    for role in roles:
        db.add(UserRole(user_id=user.id, role=role))
    audit(db, actor.id, "user.create", "user", user.id, {"roles": roles})
    db.commit()
    return {"id": user.id, "temporary_password": password}


@router.patch("/admin/users/{user_id}")
def set_user_status(user_id: int, body: UserStatusIn, actor: User = ADMIN, db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if target is None:
        raise ApiError(404, "NOT_FOUND", "That user could not be found.")
    if "super_admin" in roles_for(db, target.id) or target.id == actor.id:
        raise ApiError(403, "FORBIDDEN", "This account cannot be changed here.")
    target.status = body.status
    audit(db, actor.id, "user.status", "user", target.id, {"status": body.status})
    db.commit()
    return {"ok": True}


class ImpersonateIn(BaseModel):
    user_id: int


@router.post("/admin/impersonate")
def admin_impersonate(body: ImpersonateIn, response: Response, actor: User = ADMIN, db: Session = Depends(get_db)):
    target = db.get(User, body.user_id)
    if target is None:
        raise ApiError(404, "NOT_FOUND", "That user could not be found.")
    if target.status != "active":
        raise ApiError(400, "INACTIVE_USER", "Cannot switch into an inactive or disabled account.")
    target_roles = roles_for(db, target.id)
    if "super_admin" in target_roles:
        raise ApiError(403, "FORBIDDEN", "Admins cannot switch into a Super Admin account.")

    settings = get_settings()
    sig = token_digest(f"{actor.id}:{settings.session_secret}")
    cookie_val = f"{actor.id}.{sig}"
    response.set_cookie(
        IMPERSONATOR_COOKIE,
        cookie_val,
        max_age=settings.session_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )

    audit(db, actor.id, "admin.impersonate", "user", target.id, {
        "admin_id": actor.id,
        "admin_email": actor.email,
        "target_id": target.id,
        "target_email": target.email,
        "target_roles": sorted(target_roles),
    })

    start_session(response, db, target)
    return {
        "ok": True,
        "redirect": home_for(target_roles),
        "user": user_row(db, target),
    }


@router.get("/admin/audit-log")
def audit_log(limit: int = 200, _: User = ADMIN, db: Session = Depends(get_db)):
    return {"items": _audit_items(db, min(max(limit, 1), 500))}


def _audit_items(db: Session, limit: int) -> list[dict]:
    rows = db.scalars(select(AuditLog).order_by(AuditLog.at.desc()).limit(limit)).all()
    items = []
    for row in rows:
        actor = db.get(User, row.actor_id) if row.actor_id else None
        items.append(
            {
                "at": row.at.isoformat() + "Z",
                "actor": actor.name if actor else "System",
                "action": row.action,
                "entity": row.entity,
                "entity_id": row.entity_id,
                "detail": row.detail,
            }
        )
    return items


# ---- super admin ----------------------------------------------------------------------------------

@router.get("/superadmin/overview")
def superadmin_overview(_: User = SUPER, db: Session = Depends(get_db)):
    users = db.scalar(select(func.count(User.id))) or 0
    verified = db.scalar(select(func.coalesce(func.sum(Payment.amount_inr), 0)).where(Payment.status == "verified")) or 0
    return {
        "users": users,
        "batches": db.scalar(select(func.count(Batch.id))) or 0,
        "enrolments": db.scalar(select(func.count(Enrolment.id))) or 0,
        "verified_income_inr": int(verified),
    }


@router.get("/superadmin/users")
def superadmin_users(_: User = SUPER, db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.name)).all()
    return {"items": [user_row(db, u) for u in users]}


@router.put("/superadmin/users/{user_id}/roles")
def set_roles(user_id: int, body: RolesIn, actor: User = SUPER, db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if target is None:
        raise ApiError(404, "NOT_FOUND", "That user could not be found.")
    roles = check_roles(body.roles, allow_super=True)
    if target.id == actor.id and "super_admin" not in roles:
        raise ApiError(422, "VALIDATION", "You cannot remove your own super admin role.", {"roles": "Keep super admin on your own account."})
    db.query(UserRole).filter(UserRole.user_id == target.id).delete()
    for role in roles:
        db.add(UserRole(user_id=target.id, role=role))
    audit(db, actor.id, "user.roles", "user", target.id, {"roles": roles})
    db.commit()
    return {"ok": True, "roles": roles}


@router.get("/superadmin/settings")
def get_settings_view(_: User = SUPER, db: Session = Depends(get_db)):
    return {
        "attendance_threshold_percent": threshold_percent(db),
        "require_fees_cleared": fees_must_clear(db),
        "academy_name": get_setting(db, "academy_name", "Aintrix Academy"),
        "payment_instructions": get_setting(db, "payment_instructions", ""),
    }


@router.put("/superadmin/settings")
def put_settings(body: SettingsIn, actor: User = SUPER, db: Session = Depends(get_db)):
    set_setting(db, "attendance_threshold_percent", str(body.attendance_threshold_percent))
    set_setting(db, "require_fees_cleared", "true" if body.require_fees_cleared else "false")
    set_setting(db, "academy_name", body.academy_name.strip())
    set_setting(db, "payment_instructions", body.payment_instructions.strip())
    audit(db, actor.id, "settings.update", "settings", "global", body.model_dump())
    db.commit()
    return {"ok": True}


@router.get("/superadmin/audit-log")
def superadmin_audit(limit: int = 300, _: User = SUPER, db: Session = Depends(get_db)):
    return {"items": _audit_items(db, min(max(limit, 1), 1000))}
