from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.document import Document


def search_documents(db: Session, query: str, limit: int = 25) -> list[Document]:
    statement = text(
        """
        SELECT *
        FROM documents
        WHERE extracted_text ILIKE :needle
        ORDER BY created_at DESC
        LIMIT :limit
        """
    )
    rows = db.execute(statement, {"needle": f"%{query}%", "limit": limit}).mappings().all()
    return [Document(**row) for row in rows]
