from pathlib import Path


def ensure_directories(*paths: str) -> None:
    for raw in paths:
        Path(raw).mkdir(parents=True, exist_ok=True)


def document_path(upload_dir: str, document_id: str, filename: str) -> Path:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    folder = Path(upload_dir) / document_id
    folder.mkdir(parents=True, exist_ok=True)
    return folder / safe_name


def export_path(export_dir: str, document_id: str, extension: str) -> Path:
    folder = Path(export_dir) / document_id
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"export.{extension}"
