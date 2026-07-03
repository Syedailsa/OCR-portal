from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
import app.models  # noqa: F401
from app.core.security import hash_password
from app.models.user import User
from app.services.storage import ensure_directories

settings = get_settings()

Base.metadata.create_all(bind=engine)
ensure_directories(settings.upload_dir, settings.export_dir)

app = FastAPI(title="OCR Portal API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def seed_default_admin() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "admin@gmail.com"))
        if user is None:
            db.add(
                User(
                    email="admin@gmail.com",
                    password_hash=hash_password("user123"),
                    is_active=True,
                    is_admin=True,
                )
            )
            db.commit()
    finally:
        db.close()
