# Deployment

## Branches

- `develop`: active development
- `main`: production deploy branch

## Deployment target

- Web: `https://ocr-portal.27.jugaar.ai`
- API: `https://api.ocr-portal.27.jugaar.ai`

## Required env

Copy from `.env.example` and set your real values in the panel.
For MVP, keep `QUEUE_MODE=inline` and leave `REDIS_URL` empty.
If you later want background OCR jobs, set `QUEUE_MODE=celery` and put your Upstash `rediss://` URL in `REDIS_URL`.

## VPS panel steps

1. Connect the GitHub repository `Syedailsa/OCR-portal`.
2. Select branch `main`.
3. Provide the env vars from `.env.example`.
4. Use native app processes if Docker is unavailable.
5. Ensure ports `80` and `443` are allowed.
6. Deploy.

## Minimal MVP mode

- FastAPI runs without Celery.
- OCR runs inline during upload/reprocess.
- Upstash Redis is optional.
- PostgreSQL still stores metadata and extracted text.

## Data locations

- Uploads: VPS disk
- Exports: VPS disk
- Database: VPS PostgreSQL install or managed PostgreSQL
- Redis: optional Upstash only if queue mode is enabled
