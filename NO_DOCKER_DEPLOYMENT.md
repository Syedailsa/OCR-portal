# No Docker Deployment

This is the minimal MVP path.

## Services

- Frontend: static Node server on port `3000`
- API: FastAPI on port `8000`
- Database: PostgreSQL on the VPS or managed PostgreSQL
- Queue: disabled by default
- Redis: optional Upstash only if you enable background OCR later

## Env

Use `.env.example` and set:

```env
QUEUE_MODE=inline
REDIS_URL=
```

## Run order

1. Install Python 3.12 and Node.js 20+.
2. Install PostgreSQL and create the database/user.
3. Clone the repo from GitHub.
4. Create `apps/api/.env` from the root `.env` values.
5. In `apps/api`, install Python deps.
6. In `apps/web`, install Node deps and build the frontend.
7. Start API and web as separate processes via the panel.

## Commands

API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Web:

```bash
npm run start -- --hostname 0.0.0.0 --port 3000
```

If the panel only supports one web process, use `npm start` for the static frontend and keep the API on `8000`.
