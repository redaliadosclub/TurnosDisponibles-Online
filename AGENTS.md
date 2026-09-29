# Base44 Dev Environment

## Architecture
Single-origin app: `tsx server.ts` runs an Express server on port 3000 that serves both the API (`/api/*`, backed by a local JSON file at `data/db.json` via `server/db.ts`) and the React frontend (Vite in middleware mode). No separate API service or database container needed.

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
- Node 22 slim image, source bind-mounted at `/app`.
- On startup: `npm install` then `exec npx tsx server.ts` (dev mode).
- Health check: `GET /api/health` → `{"status":"ok"}`.
- HMR is disabled (`DISABLE_HMR=true`) to avoid websocket issues behind the proxy; use `reload_preview` after edits to see changes.

## Environment / Secrets
- `GEMINI_API_KEY` (optional): Google Gemini API key for AI chat and gap-campaign features. The app boots fine without it — `getGenAI()` returns null and AI endpoints degrade gracefully. Obtain from Google AI Studio.
- `APP_URL` is referenced in `.env.example` but not actually used in code.
- No other external services or credentials are required to boot.

## Test Accounts (preset in server.ts)
- `agenciaclienteya@gmail.com` / `admin123` — superadmin
- `dueno@consultorio.com` / `dueno123` — business owner
- `staff@consultorio.com` / `staff123` — staff
- `paciente@prueba.com` / `paciente123` — customer

## Verifying
- `curl http://localhost:3000/api/health` confirms the server is up.
- The frontend loads at `/` and renders the TurnosDisponibles portal.
- Firebase config in `firebase-applet-config.json` is present but the app's data layer goes through the server's local JSON DB, not Firestore.
