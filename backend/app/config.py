"""Settings come from environment variables. Production refuses to start without its required values."""
import os
import secrets
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv

_backend_env = Path(__file__).resolve().parent.parent / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env)



@dataclass(frozen=True)
class Settings:
    app_env: str
    database_url: str
    session_secret: str
    cookie_secure: bool
    upload_dir: str
    session_hours: int
    attendance_default_percent: int
    google_meet_api_key: str = ""


def _env(name: str, default: str) -> str:
    """An empty variable (for example DATABASE_URL=) means 'use the default', not an empty value."""
    return (os.getenv(name) or "").strip() or default


@lru_cache
def get_settings() -> Settings:
    app_env = _env("APP_ENV", "development").lower()
    if app_env not in {"development", "test", "production"}:
        raise RuntimeError("APP_ENV must be development, test or production.")

    secret = _env("SESSION_SECRET", "")
    if app_env == "production" and len(secret) < 32:
        raise RuntimeError("SESSION_SECRET is required in production (32 characters or more).")
    if not secret:
        # Development and tests only: a fresh random value per start, so nothing is hard-coded.
        secret = secrets.token_urlsafe(48)

    default_secure = "true" if app_env == "production" else "false"
    return Settings(
        app_env=app_env,
        database_url=_env("DATABASE_URL", "sqlite:///./data/academy.db"),
        session_secret=secret,
        cookie_secure=_env("COOKIE_SECURE", default_secure).lower() == "true",
        upload_dir=_env("UPLOAD_DIR", "./data/uploads"),
        session_hours=int(_env("SESSION_HOURS", "12")),
        attendance_default_percent=int(_env("ATTENDANCE_THRESHOLD_PERCENT", "60")),
        google_meet_api_key=_env("GOOGLE_MEET_API_KEY", ""),
    )
