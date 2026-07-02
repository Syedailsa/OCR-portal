from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    original_filename: str
    mime_type: str
    status: str
    language: str | None = None
    page_count: int = 0
    file_size: int = 0
    extracted_text: str | None = None
    error_message: str | None = None


class SearchResponse(BaseModel):
    items: list[DocumentResponse]
