from collections.abc import Iterator

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import SessionLocal
from .errors import ApiError
from .models import AuthSession, User, UserRole
from .security import token_digest
from .timeutil import utcnow

SESSION_COOKIE = "academy_session"
CSRF_COOKIE = "academy_csrf"
ROLES = ("student", "trainer", "manager", "financier", "admin", "super_admin")


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def roles_for(db: Session, user_id: int) -> set[str]:
    return set(db.scalars(select(UserRole.role).where(UserRole.user_id == user_id)).all())


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise ApiError(401, "UNAUTHORISED", "Please sign in to continue.")
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_digest(token)))
    if session is None or session.expires_at < utcnow():
        raise ApiError(401, "UNAUTHORISED", "Your session has ended. Please sign in again.")
    user = db.get(User, session.user_id)
    if user is None or user.status != "active":
        raise ApiError(401, "UNAUTHORISED", "Please sign in to continue.")
    return user


def require_roles(*allowed: str):
    """Lets through anyone holding one of the roles, and always lets through the super admin."""

    def dependency(user: User = Depends(current_user), db: Session = Depends(get_db)) -> User:
        roles = roles_for(db, user.id)
        if "super_admin" in roles or roles.intersection(allowed):
            return user
        raise ApiError(403, "FORBIDDEN", "You do not have access to this area.")

    return dependency
