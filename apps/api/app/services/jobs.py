from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.document import Document
from app.services.document_processing import process_document_sync


def queue_or_process_document(db: Session, document_id: uuid.UUID) -> str:
    settings = get_settings()
    if settings.queue_mode.lower() == "celery" and settings.redis_url:
        from worker.tasks import process_document

        process_document.delay(str(document_id))
        return "queued"

    try:
        process_document_sync(db, document_id)
    except Exception as exc:
        db.rollback()
        document = db.scalar(select(Document).where(Document.id == document_id))
        if document is not None:
            document.status = "failed"
            document.error_message = str(exc)[:1000]
            db.commit()
        raise
    return "completed"
