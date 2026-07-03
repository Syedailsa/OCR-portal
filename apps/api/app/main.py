from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401
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
