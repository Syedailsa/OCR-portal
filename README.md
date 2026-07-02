# OCR Portal

Production-ready OCR portal scaffold.

## Stack

- Web: Next.js
- API: FastAPI
- Worker: Celery
- Database: PostgreSQL
- Queue: Redis
- Storage: VPS disk
- Reverse proxy: Caddy

## Local / VPS setup

1. Copy `.env.example` to `.env` and fill values.
2. Point DNS:
   - `ocr-portal.27.jugaar.ai`
   - `api.ocr-portal.27.jugaar.ai`
3. Run `docker compose up -d --build`.

## Services

- Web app: `https://ocr-portal.27.jugaar.ai`
- API: `https://api.ocr-portal.27.jugaar.ai`
