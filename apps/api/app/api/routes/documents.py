from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_subject, get_database
from app.core.config import get_settings
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.services.export import build_docx_bytes, build_pdf_bytes
from app.services.storage import document_path, ensure_directories, export_path
from worker.tasks import process_document

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
}


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


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> DocumentResponse:
    settings = get_settings()
    ensure_directories(settings.upload_dir, settings.export_dir)

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    document_id = uuid.uuid4()
    storage_file = document_path(settings.upload_dir, str(document_id), file.filename or "upload.bin")
    storage_file.write_bytes(content)

    document = Document(
        id=document_id,
        owner_id=uuid.UUID(subject),
        original_filename=file.filename or storage_file.name,
        mime_type=file.content_type,
        storage_path=str(storage_file),
        status="queued",
        file_size=len(content),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    process_document.delay(str(document.id))
    return _to_response(document)


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> list[DocumentResponse]:
    documents = db.scalars(select(Document).where(Document.owner_id == uuid.UUID(subject)).order_by(Document.created_at.desc())).all()
    return [_to_response(document) for document in documents]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> DocumentResponse:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == uuid.UUID(subject)))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _to_response(document)


@router.get("/{document_id}/text")
def get_text(
    document_id: uuid.UUID,
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> dict[str, str | None]:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == uuid.UUID(subject)))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return {"text": document.extracted_text}


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
def reprocess_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> DocumentResponse:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == uuid.UUID(subject)))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    document.status = "queued"
    document.error_message = None
    db.commit()
    process_document.delay(str(document.id))
    db.refresh(document)
    return _to_response(document)


@router.get("/{document_id}/status")
def document_status(
    document_id: uuid.UUID,
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> dict[str, str]:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == uuid.UUID(subject)))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return {"status": document.status}


@router.post("/{document_id}/export/word")
def export_word(
    document_id: uuid.UUID,
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> dict[str, str]:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == uuid.UUID(subject)))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    settings = get_settings()
    ensure_directories(settings.export_dir)
    path = export_path(settings.export_dir, str(document.id), "docx")
    path.write_bytes(build_docx_bytes(document.original_filename, document.extracted_text))
    return {"download_url": f"{settings.api_url}/exports/{document.id}/download"}


@router.post("/{document_id}/export/pdf")
def export_pdf(
    document_id: uuid.UUID,
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
) -> dict[str, str]:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == uuid.UUID(subject)))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    settings = get_settings()
    ensure_directories(settings.export_dir)
    path = export_path(settings.export_dir, str(document.id), "pdf")
    path.write_bytes(build_pdf_bytes(document.original_filename, document.extracted_text))
    return {"download_url": f"{settings.api_url}/exports/{document.id}/download?format=pdf"}


@router.get("/{document_id}/download")
def download_export(
    document_id: uuid.UUID,
    format: str = Query(default="docx", pattern="^(docx|pdf)$"),
    db: Session = Depends(get_database),
    subject: str = Depends(get_current_subject),
):
    document = db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == uuid.UUID(subject)))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    settings = get_settings()
    path = export_path(settings.export_dir, str(document.id), format)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not generated yet")
    media_type = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(path, media_type=media_type, filename=path.name)
