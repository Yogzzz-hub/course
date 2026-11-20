import hmac
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import get_settings
from .db import init_db
from .deps import CSRF_COOKIE
from .errors import ApiError
from .routers import admin, auth, finance, manager, student, trainer

CSRF_EXEMPT = {"/v1/auth/login", "/v1/dev/login-as"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    init_db()
    from pathlib import Path

    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Aintrix Academy API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.app_env == "production" else "/docs",
        redoc_url=None,
    )

    @app.middleware("http")
    async def csrf_guard(request: Request, call_next):
        path = request.url.path
        if request.method not in {"GET", "HEAD", "OPTIONS"} and path.startswith("/v1/") and path not in CSRF_EXEMPT:
            cookie = request.cookies.get(CSRF_COOKIE, "")
            header = request.headers.get("x-csrf-token", "")
            if not cookie or not hmac.compare_digest(cookie, header):
                return JSONResponse(
                    status_code=403,
                    content={"error": {"code": "CSRF", "message": "Your session token is missing or out of date. Refresh the page and try again.", "fields": None}},
                )
        return await call_next(request)

    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        body = {"code": exc.code, "message": exc.message, "fields": exc.fields}
        if exc.details is not None:
            body["details"] = exc.details
        return JSONResponse(status_code=exc.status, content={"error": body})

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for item in exc.errors():
            key = str(item["loc"][-1]) if item.get("loc") else "form"
            fields.setdefault(key, item.get("msg", "Invalid value."))
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "VALIDATION", "message": "Some details are missing or invalid.", "fields": fields}},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail), "fields": None}})

    @app.get("/v1/health")
    def health():
        return {"status": "ok"}

    for module in (auth, manager, trainer, finance, admin, student):
        app.include_router(module.router)
    return app


app = create_app()
