from __future__ import annotations

import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.document import Document
from app.services.ocr import extract_text_from_pdf, fallback_ocr


def process_document_sync(db: Session, document_id: uuid.UUID) -> None:
    settings = get_settings()
    document = db.scalar(select(Document).where(Document.id == document_id))
    if document is None:
        return

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
