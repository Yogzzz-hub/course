from datetime import timedelta

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..deps import CSRF_COOKIE, ROLES, SESSION_COOKIE, current_user, get_db, roles_for
from ..errors import ApiError
from ..models import AuthSession, User, UserRole
from ..security import hash_password, new_token, temporary_password, token_digest, verify_password
from ..timeutil import utcnow

router = APIRouter(prefix="/v1", tags=["auth"])

ROLE_HOME = {
    "super_admin": "/superadmin",
    "manager": "/manager",
    "financier": "/finance",
    "admin": "/admin/overview",
    "trainer": "/trainer",
    "student": "/app",
}
HOME_PRIORITY = ["super_admin", "manager", "financier", "admin", "trainer", "student"]


def home_for(roles: set[str]) -> str:
    for role in HOME_PRIORITY:
        if role in roles:
            return ROLE_HOME[role]
    return "/app"


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=190)
    password: str = Field(min_length=1, max_length=200)


class DevLoginIn(BaseModel):
    role: str


def start_session(response: Response, db: Session, user: User) -> None:
    settings = get_settings()
    token = new_token()
    csrf = new_token()
    now = utcnow()
    db.add(
        AuthSession(
            token_hash=token_digest(token),
            user_id=user.id,
            created_at=now,
            expires_at=now + timedelta(hours=settings.session_hours),
        )
    )
    db.commit()
    max_age = settings.session_hours * 3600
    response.set_cookie(
        SESSION_COOKIE, token, max_age=max_age, httponly=True, secure=settings.cookie_secure, samesite="lax", path="/"
    )
    # The CSRF cookie is readable by the page so it can echo it back in the X-CSRF-Token header.
    response.set_cookie(
        CSRF_COOKIE, csrf, max_age=max_age, httponly=False, secure=settings.cookie_secure, samesite="lax", path="/"
    )


@router.post("/auth/login")
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user is None or not verify_password(user.password_hash, body.password) or user.status != "active":
        raise ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.")
    start_session(response, db, user)
    return {"redirect": home_for(roles_for(db, user.id))}


@router.post("/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == token_digest(token)))
        db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": sorted(roles_for(db, user.id)),
    }


@router.post("/dev/login-as")
def dev_login_as(body: DevLoginIn, response: Response, db: Session = Depends(get_db)):
    """Development only: signs in as a test account for one role, without a password. Never available in production."""
    if get_settings().app_env != "development":
        raise ApiError(404, "NOT_FOUND", "Not found.")
    if body.role not in ROLES:
        raise ApiError(422, "VALIDATION", "Choose a valid role.", {"role": "Choose a valid role."})

    email = f"dev-{body.role}@local.test"
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            name=f"Dev {body.role.replace('_', ' ').title()}",
            email=email,
            phone="",
            password_hash=hash_password(temporary_password()),
            is_dev_account=True,
        )
        db.add(user)
        db.flush()
    has_role = db.scalar(select(UserRole.id).where(UserRole.user_id == user.id, UserRole.role == body.role))
    if has_role is None:
        db.add(UserRole(user_id=user.id, role=body.role))
    db.commit()
    start_session(response, db, user)
    return {"redirect": ROLE_HOME[body.role]}
