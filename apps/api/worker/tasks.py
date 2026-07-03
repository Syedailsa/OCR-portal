from __future__ import annotations

import uuid

from sqlalchemy import select

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.document_processing import process_document_sync
from worker.celery_app import celery_app

Base.metadata.create_all(bind=engine)


@celery_app.task(name="worker.tasks.process_document", bind=True, max_retries=3)
def process_document(self, document_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        process_document_sync(db, uuid.UUID(document_id))
        return {"status": "completed"}
    except Exception as exc:  # pragma: no cover - worker boundary
        db.rollback()
        from app.models.document import Document

        document = db.scalar(select(Document).where(Document.id == uuid.UUID(document_id)))
        if document is not None:
            document.status = "failed"
            document.error_message = str(exc)[:1000]
            db.commit()
        raise self.retry(exc=exc, countdown=2**self.request.retries)
    finally:
        db.close()
