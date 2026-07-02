from __future__ import annotations

import uuid
from pathlib import Path

from celery import shared_task
from sqlalchemy import select

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.document import Document
from app.services.ocr import extract_text_from_pdf, fallback_ocr
from worker.celery_app import celery_app

settings = get_settings()

Base.metadata.create_all(bind=engine)


@celery_app.task(name="worker.tasks.process_document", bind=True, max_retries=3)
def process_document(self, document_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        document = db.scalar(select(Document).where(Document.id == uuid.UUID(document_id)))
        if document is None:
            return {"status": "missing"}

        document.status = "processing"
        db.commit()

        file_path = Path(document.storage_path)
        if document.mime_type == "application/pdf" and file_path.suffix.lower() == ".pdf":
            result = extract_text_from_pdf(file_path)
        else:
            result = fallback_ocr(file_path)

        if result.page_count > settings.ocr_max_pages:
            raise ValueError(f"Document exceeds page limit of {settings.ocr_max_pages}")

        document.extracted_text = result.text
        document.language = result.language
        document.page_count = result.page_count
        document.confidence_score = result.confidence_score
        document.status = "completed"
        document.error_message = None
        db.commit()
        return {"status": "completed"}
    except Exception as exc:  # pragma: no cover - worker boundary
        db.rollback()
        document = db.scalar(select(Document).where(Document.id == uuid.UUID(document_id)))
        if document is not None:
            document.status = "failed"
            document.error_message = str(exc)[:1000]
            db.commit()
        raise self.retry(exc=exc, countdown=2**self.request.retries)
    finally:
        db.close()
