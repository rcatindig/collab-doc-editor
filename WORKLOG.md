# Ajaia Docs Work Log

## Milestone 0 — Workspace inspection and initial plan

**Date:** 2026-10-29

- Inspected the workspace before implementation. It is empty: no application files, dependency manifests, or Git repository are present.
- Drafted a minimal full-stack architecture, schema, API surface, component breakdown, access-control model, dependency-ordered implementation plan, and time-boxed exclusions. The plan is pending approval; no application implementation has started.
- No tests or deployment checks have been run.

**Next:** Await approval of the proposed plan before creating the application.

## Milestone 1 — Initial application implementation

**Date:** 2026-10-29

- Added a React/TypeScript/Vite frontend with a document list, separate owned/shared sections, Tiptap formatting controls, autosaving title and content, text/Markdown import, and account-email sharing UI.
- Added Laravel 11/Sanctum API source, PostgreSQL migrations, session/CORS configuration, authentication and document endpoints, and document authorization policies.
- Added PHPUnit feature coverage for owner access, shared edit access, owner-only operations, outsider denial, and sharing persistence.
- Added setup/deployment guidance and an AI workflow note in `README.md`.
- **Verification:** `php -l` passed for all PHP files. Composer scaffold could not resolve Packagist (`curl error 6`); npm scaffold could not fetch packages and was stopped. PHPUnit and the frontend build were therefore not run. This workspace has no Git repository. No live deployment was made because there is no configured deployment target or credentials.

**Known follow-up:** Install dependencies in a network-enabled environment, run PHPUnit and the frontend production build, fix any resulting issues, exercise the session flow with two accounts, then deploy and record the verified URL.

## Milestone 2 — Dependency and deployment availability check

**Date:** 2026-10-29

- Retried `composer install` from `api/`; it again failed because Packagist DNS resolution is unavailable.
- Retried `npm install` from `web/`; it did not complete and was stopped. A root-level npm attempt confirmed there is no root `package.json`; frontend instructions correctly run from `web/`.
- Checked for deployment CLIs and deployment-related environment variable names; none were present. No deployment integration is available in connected tools.
- The global TypeScript compiler is 4.9.5, while the project requests TypeScript 5.6; the global compiler cannot interpret the project's `moduleResolution: Bundler` setting. This is not a project build result. PHP syntax lint remains the only completed code verification.
- No files containing secrets were read or printed.

**Blocked items:** dependency installation, PHPUnit execution, Vite production build, interactive two-account verification, and live deployment. They require registry network access and a deployment target with credentials.

## Milestone 3 — Local Docker setup

**Date:** 2026-10-29

- Added a local Compose stack with PostgreSQL, a PHP/Laravel API image, and a Vite frontend container. Local ports bind to `127.0.0.1`; the database uses a clearly marked local-only password.
- Added API initialization for an application key and database migrations, and added Docker setup and test commands to the README.
- **Verification:** `docker compose config --quiet` passed; `composer.json` parsed as valid JSON; PHP syntax lint passed again.
- **Not run:** Docker could not connect to its Engine socket (`~/.orbstack/run/docker.sock`: permission denied). No images were built, dependencies fetched, containers started, or application tests run.

## Milestone 4 — Fix Composer security advisory block

**Date:** 2026-10-29

- User reported that Composer refused all Laravel 11 versions because of security advisories.
- Updated the API requirement to Laravel 13 and PHP 8.3, matching the Docker image. Sanctum 4 supports Laravel 13. This avoids disabling Composer's security policy.
- **Verification:** Laravel's official release notes list Laravel 13 as requiring PHP 8.3 and show its support window; Packagist lists current Laravel 13 releases, and the Sanctum package metadata includes Illuminate 13 support.
- Local `composer update --no-install` still cannot resolve Packagist DNS, so no lockfile was generated. The next Docker rebuild will resolve a fresh dependency set and may reveal further compatibility issues.

## Milestone 5 — Avoid local API port conflict

**Date:** 2026-10-29

- User's Docker Engine reported host port 8000 already allocated. Moved the Compose API host port to 8001 and updated the frontend API URL, `APP_URL`, and Sanctum stateful domains consistently.
- Updated local setup instructions. Restart the stack with `docker compose up --build` and open the API at `http://localhost:8001`.

## Milestone 6 — Diagnose PostgreSQL host mismatch

**Date:** 2026-10-29

- User reported the API still attempting `127.0.0.1:5432`. In Compose, the API's database hostname must be the service name `db`; loopback inside a container refers to that same API container.
- Changed the frontend fallback API URL from port 8000 to the Compose API port 8001. Direct, non-Docker development can still override it with `VITE_API_URL=http://localhost:8000` as described in the setup instructions.
- The Docker Engine socket is inaccessible from this agent environment, so I could not inspect live service state. The user should verify `docker compose exec api printenv DB_HOST` is `db` and that the browser request goes to `localhost:8001`.

## Milestone 7 — Align HTTP server environment with migrations

**Date:** 2026-10-29

- User confirmed the browser calls port 8001, Compose passes `DB_HOST=db`, and `php artisan migrate:status` succeeds, while HTTP registration still attempted `127.0.0.1` from `.env.example`.
- Changed the API container entrypoint to start PHP's built-in server directly with Laravel's router script instead of `php artisan serve`, so the HTTP process inherits the Compose environment used by Artisan commands.
- **Initial attempt failed:** Laravel's router script uses the current working directory as its public path. The first direct invocation ran from `/app`, and `curl /up` exposed a `require_once(/app/index.php)` error.
- Corrected the entrypoint to change into `/app/public` before starting the server, matching Laravel's router script expectation.
- User rebuilt the API and confirmed `curl -i http://localhost:8001/up` returns HTTP 200 with Laravel's “Application up” response.
- User subsequently confirmed the local application is working after the API server path fix.
- No automated PHPUnit run or production frontend build has been reported; only the local Docker startup and user-confirmed application flow are verified.

## Milestone 8 — Local Docker launch and runtime debugging

**Date:** 2026-10-29

- **Implemented:** Local Compose stack for React/Vite, Laravel API, and PostgreSQL. Updated API to Laravel 13/PHP 8.3 after Composer security policy blocked Laravel 11; moved the host API port from 8000 to 8001 after a port conflict. Changed the API entrypoint to run PHP's built-in server from `api/public` with Laravel's router script.
- **Engineering decisions:** Kept Composer's advisory blocking enabled; Laravel 13 is supported and Sanctum 4 supports it. Used the Compose service name `db` for container-to-container database access. Running the router from `public/` fixes its requirement for `public/index.php` and preserves the container's environment.
- **AI assistance and changes:** AI drafted the application and Docker setup and proposed debugging steps. The initial direct-server command ran from `/app`, producing `require_once(/app/index.php)`; user-provided `curl` output exposed this and the entrypoint was corrected to `cd public`. An AI suggestion to add a Vite proxy was withdrawn after that root cause was clear; no proxy change was made.
- **Checks/results:** PHP syntax lint passed for the PHP source; `sh -n api/docker/entrypoint.sh`, `docker compose config --quiet`, and Composer JSON parsing passed. User confirmed `DB_HOST=db`, all three migrations report `Ran`, and `curl http://localhost:8001/up` returns HTTP 200 with Laravel's “Application up” response. User then confirmed the local application is working.
- **Not run / remaining:** PHPUnit, production Vite build, and two-account feature verification have not been reported. No Composer lockfile was generated in the workspace. No live deployment was performed; there is no selected deployment target or credentials.

**Next milestone:** Run PHPUnit and the frontend production build, then verify document creation/editing, sharing, and access restrictions with two accounts. Handle deployment only after a target is selected and credentials are available.

## Milestone 9 — Make sign-out discoverable

- Replaced the unlabeled arrow-only account control with a visible “Sign out” label and hover treatment in the sidebar.
- No automated checks were run for this UI-only change.

## Milestone 10 — Real-time collaborative editing

**Date:** 2026-10-29

- **Implemented:** Added a Hocuspocus WebSocket service with Yjs, Tiptap collaboration/cursor extensions, live connection/presence status, and remote cursor styles. Added a PostgreSQL binary Yjs state column; the collaboration service seeds it from existing Tiptap JSON on first connect and persists Yjs updates plus a JSON snapshot. Added a Laravel collaboration-access endpoint protected by Sanctum and the existing document view policy. Added the WebSocket service to Docker Compose and updated local setup and two-session instructions.
- **Engineering decisions:** Used Yjs CRDT updates to merge concurrent edits; retained Tiptap JSON in the existing REST model for compatibility. The WebSocket service validates the browser origin and forwards the session cookie to Laravel for per-document authorization. Hocuspocus v4 requires Node 22, so its container uses Node 22.
- **AI assistance:** AI selected the Hocuspocus/Yjs integration based on current official documentation and drafted the service, migration, client integration, authorization route, and Compose configuration. Official Hocuspocus docs describe CRDT synchronization, auth hooks, and binary persistence. No user-rejected AI proposal occurred in this milestone.
- **Tests/checks run:** PHP syntax lint passed for all API PHP files; `node --check collab/server.js` passed; `docker compose config --quiet` passed; both frontend and collaboration `package.json` files parsed successfully. PHPUnit, npm dependency installation, frontend build, and live two-session editing were not run in this environment.
- **Bugs/blockers/remaining:** Dependency compatibility and runtime behavior remain unverified until Docker rebuilds the new web and collaboration packages. The new migration must run against the existing Compose database. No deployment was requested or performed.

**Next milestone:** Rebuild the Compose stack, confirm the collaboration migration and WebSocket service start, then verify simultaneous edits, cursor presence, persistence after reload, and denied access for an unrelated account. Run PHPUnit and the frontend production build after dependency installation.

## Milestone 11 — Hide binary collaboration state in REST responses

- User reported a “Type is not supported” toast after sharing while the collaboration status showed Live. The share handler refreshes document lists after sharing; those models included the new binary Yjs column in JSON serialization.
- Marked `collaboration_state` hidden on the `Document` model and added a PHPUnit regression test that stores binary state and checks the owned-document response excludes it.
- PHP syntax checks passed for the changed model and test. PHPUnit was not run.
- **Next:** Rebuild/recreate the API container and retry sharing; then run the regression test and two-account collaboration check.

