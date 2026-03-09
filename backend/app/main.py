import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import Base, engine
from .api.auth import router as auth_router
from .api.admin import router as admin_router
from .services.auth_service import ensure_default_admin
from .websocket import router as websocket_router


settings = get_settings()

app = FastAPI(title=settings.app_name, debug=settings.debug)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug or not settings.cors_origins else [str(o) for o in settings.cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Ensure database directory exists
    db_dir = os.path.dirname(settings.sqlite_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        
    # Create tables for PoC; in production use Alembic migrations instead.
    Base.metadata.create_all(bind=engine)
    ensure_default_admin()


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(websocket_router)
app.include_router(auth_router)
app.include_router(admin_router)

