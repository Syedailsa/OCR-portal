# OCR Portal

Production-ready OCR portal scaffold.

## Stack

- Web: static Node server
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
3. Start the web app with `npm start`.

## Git deploy flow

Use `develop` for feature work and `main` for deploys.

1. Work locally on `develop`.
2. Push changes to GitHub.
3. Merge or fast-forward `develop` into `main`.
4. In the VPS panel, deploy the `main` branch from GitHub.
5. Set environment variables from `.env.example`.
6. Start with Docker Compose.

## VPS notes

1. No SSH access is required for the current setup.
2. Files are stored on the VPS disk.
3. PostgreSQL can be local or managed.
4. Redis is optional and only needed for queue mode.
5. Caddy handles TLS for the subdomains automatically.

## Minimal MVP path

If Docker is unavailable, use `NO_DOCKER_DEPLOYMENT.md`.

## Services

- Web app: `https://ocr-portal.27.jugaar.ai`
- API: `https://api.ocr-portal.27.jugaar.ai`
