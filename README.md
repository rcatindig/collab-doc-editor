# Ajaia Docs

A small collaborative document editor built with React, TypeScript, Tiptap, Laravel 13, Sanctum, PostgreSQL, Yjs, and Hocuspocus.

## Development setup

Dependencies could not be downloaded in the current build environment (DNS/network access to Packagist and npm registry is unavailable). Install dependencies on a network-enabled machine first.

The API requires PHP 8.3 or newer (also provided by the Docker image).

1. Create PostgreSQL database `ajaia_docs`.
2. In `api/`, run `composer install`, copy `.env.example` to `.env`, configure PostgreSQL and frontend origins, then run `php artisan key:generate` and `php artisan migrate`. Start the API on port 8000 with `php artisan serve`.
3. In `collab/`, run `npm install`, set `DB_HOST=127.0.0.1`, `DB_DATABASE=ajaia_docs`, `DB_USERNAME`, `DB_PASSWORD`, `API_INTERNAL_URL=http://localhost:8000`, and `WEB_ORIGIN=http://localhost:5173`, then run `npm start`.
4. In `web/`, run `npm install`, set `VITE_API_URL=http://localhost:8000` and `VITE_COLLAB_URL=ws://localhost:1234`, and run `npm run dev`.
5. Open `http://localhost:5173`, register an account, then create or share documents by account email.

The API uses Sanctum cookie sessions. For local development, keep the frontend and API on configured stateful domains and use HTTPS in production. Set `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`, and CORS credentials to match your deployment.

### Local Docker setup

With Docker Desktop or another Docker Engine running, start the full stack from the repository root with `docker compose up --build`. Open `http://localhost:5173`; the API is at `http://localhost:8001`, collaboration WebSocket at `ws://localhost:1234`, and PostgreSQL is bound to localhost on port `5432`. Compose initializes the application key and runs migrations on API startup. Stop it with `docker compose down`; add `-v` only when you also want to delete the local database volume.

Run backend feature tests in the running API container with `docker compose exec api php artisan test`. To try live editing, open the same document in two signed-in browser sessions; remote cursors and live changes should appear in both.

The Compose database password is intended only for this local development stack. Change it before adapting the Compose file for any shared or public environment.

## Collaboration and API

Authenticated endpoints are under `/api`: `/me`, `/documents/owned`, `/documents/shared`, `/documents`, `/documents/{id}`, and `/documents/{id}/shares`. Registration and login are `/register` and `/login`. Document content is Tiptap JSON. Unauthorized document access is reported as 404.

Hocuspocus/Yjs provides conflict-safe live edits, awareness, and cursor presence. It authenticates each WebSocket document session against the Laravel session and document policy. Yjs state is persisted as binary in PostgreSQL; the JSON content column is refreshed for REST reads and compatibility. The original Tiptap JSON is converted to Yjs state on first collaborative connection.

## Verification and deployment

Run backend tests with `cd api && php artisan test`; run frontend checks with `cd web && npm run build`. Neither install nor execution has been verified in this workspace because dependencies are unavailable. Deploy the built `web/dist` as a static site and the Laravel `api/` directory to a PHP host, with PostgreSQL and HTTPS configured. No deployment credentials or remote target were provided, so no live deployment has been made.

## AI workflow

AI was used to draft architecture and generate implementation scaffolding and code. Review generated changes before production, run the documented tests, verify authorization with two accounts, and validate deployment secrets and origins. The work log records actual actions and verification; attempted commands that could not complete are not represented as passing checks.
