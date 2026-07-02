from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import fitz
import pytesseract
from PIL import Image
from langdetect.lang_detect_exception import LangDetectException
from langdetect import detect


@dataclass
class OCRResult:
    text: str
    language: str | None
    page_count: int
    confidence_score: float | None


def extract_text_from_pdf(file_path: Path) -> OCRResult:
    document = fitz.open(file_path)
    pages = []
    for page in document:
        text = page.get_text().strip()
        if not text:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text = pytesseract.image_to_string(image)
        pages.append(text.strip())
    text = "\n\n".join(chunk for chunk in pages if chunk)
    language = _detect_language(text)
    return OCRResult(text=text, language=language, page_count=len(document), confidence_score=None)


def fallback_ocr(file_path: Path) -> OCRResult:
    image = Image.open(file_path)
    text = pytesseract.image_to_string(image)
    language = _detect_language(text)
    return OCRResult(text=text.strip(), language=language, page_count=1, confidence_score=None)


def _detect_language(text: str) -> str | None:
    if not text.strip():
        return None
    try:
        return detect(text)
    except LangDetectException:
        return None
