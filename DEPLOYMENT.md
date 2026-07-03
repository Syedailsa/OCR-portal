# Deployment

## Branches

- `develop`: active development
- `main`: production deploy branch

## Deployment target

- Web: `https://ocr-portal.27.jugaar.ai`
- API: `https://api.ocr-portal.27.jugaar.ai`

## Required env

Copy from `.env.example` and set your real values in the panel.
`REDIS_URL` is internal to Docker and should stay `redis://redis:6379/0` unless you replace Redis with a managed service.

## VPS panel steps

1. Connect the GitHub repository `Syedailsa/OCR-portal`.
2. Select branch `main`.
3. Provide the env vars from `.env.example`.
4. Ensure Docker Compose is enabled.
5. Ensure ports `80` and `443` are allowed.
6. Deploy.

## Data locations

- Uploads: VPS disk
- Exports: VPS disk
- Database: Docker volume
- Redis: Docker volume
