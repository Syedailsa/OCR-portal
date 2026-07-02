import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_subject, get_database
from app.models.document import Document
from app.schemas.document import DocumentResponse

router = APIRouter(prefix="/search", tags=["search"])


def _to_response(document: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(document.id),
        original_filename=document.original_filename,
        mime_type=document.mime_type,
        status=document.status,
        language=document.language,
        page_count=document.page_count,
        file_size=document.file_size,
        extracted_text=document.extracted_text,
        error_message=document.error_message,
    )


@router.get("")
def search(
    q: str = Query(min_length=1, max_length=200),
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> list[DocumentResponse]:
    documents = db.scalars(
        select(Document)
        .where(Document.owner_id == uuid.UUID(subject), Document.extracted_text.ilike(f"%{q}%"))
        .order_by(Document.created_at.desc())
    ).all()
    return [_to_response(document) for document in documents]
