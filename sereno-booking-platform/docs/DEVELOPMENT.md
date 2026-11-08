# Development guide

Setup, scheduling guarantees, authentication, maintenance and test commands for SERENO. Commands start at the repository root unless stated otherwise.

## Run locally

Requirements: Docker with Compose plus Python for the configuration helper; or, for native development, Python 3.14, Node **24.15+**, and PostgreSQL 17. The implementation was also built and tested on the available Node 24.11.1 runtime; two transitive generator dependencies declare a newer Node minimum. Use Node 24.15+ on a clean setup.

From a clean checkout:

```sh
python scripts/setup_env.py
docker compose up --build
```

Open [SERENO](http://localhost:8080). The API applies Alembic migrations and seeds demo data when `SEED_DEMO=true` and `ENVIRONMENT=development`. PostgreSQL data persists in a named volume. Configuration generation creates fresh random credentials and refuses to overwrite existing `.env` files.

Docker is not installed on the development host used for this delivery, so Compose startup has **not** been executed here. Native PostgreSQL, migrations, API startup, frontend startup, and workflows have been tested. See [verification and limitations](DELIVERY.md).

### Native development

Run PostgreSQL on `localhost:5432` with credentials matching `apps/api/.env`. `python scripts/setup_env.py` generates both the Compose and native development environments. Create the `sereno` database first, owned by the configured role. That role must be allowed to install the trusted `btree_gist` extension in its database.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r apps/api/requirements.lock
npm ci
cd apps/api
python -m alembic upgrade head
python -m scripts.seed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS/Linux, activate with `source .venv/bin/activate` instead.

In a second terminal at the repository root:

```sh
npm run dev
```

Open [the development app](http://localhost:5173) and [the API documentation](http://localhost:8000/docs). Use `localhost` consistently for the frontend; the configured origin and cookies must agree. Vite forwards `/api` to the API on port 8000.

## Demo accounts

Only created by the development seed:

| Role                  | Email                     | Password          |
| --------------------- | ------------------------- | ----------------- |
| Administrator         | `admin@sereno.example`    | `SerenoDemo!2026` |
| Professional (Olivia) | `staff@sereno.example`    | `SerenoDemo!2026` |
| Customer (Emma)       | `customer@sereno.example` | `SerenoDemo!2026` |

Additional fictional customer accounts use `customer2@sereno.example` through `customer25@sereno.example`. The seed creates 8 services, 5 professionals, 25 customers, weekly studio/staff hours, time off, opening overrides, and approximately 240â€“250 appointments over a rolling 29-day period. Active appointments do not overlap. Past appointments include completed, cancelled, and no-show states. Each appointment has activity history and a notification.

The demo uses **Europe/London** for local schedules and GBP display prices. Dates in the product follow that business timezone, which may differ from the viewer's current date.

## Scheduling and consistency

1. Check that the service is active, the staff member is active, and the staff-service assignment exists.
2. Resolve the business-local date using `zoneinfo`. Load studio hours, employee intervals, overlapping exceptions, and confirmed blocking ranges in bounded queries.
3. Opening overrides replace the employee's recurring intervals for those dates. Intersect with studio hours; full-day closures take priority; partial closures subtract capacity.
4. Generate a local wall-clock grid at the configured interval. Round-trip each candidate through UTC to discard nonexistent DST times and preserve both distinct instants at an autumn fold.
5. Fit the **entire** effective block, including buffers, inside a working interval and outside existing confirmed blocks. Apply minimum notice and local-date booking horizon. Duration is measured in elapsed minutes, including offset transitions.
6. Recheck the same algorithm inside the booking/rescheduling transaction. Serialize competing changes on the staff row; the PostgreSQL exclusion constraint independently rejects overlapping direct writes.

Appointment instants use `TIMESTAMP WITH TIME ZONE`; clients receive ISO instants. Scheduling rules are local date/time values. Existing appointments snapshot duration, price, and buffers so catalog edits do not silently alter booked capacity or prices. Reschedule availability uses those snapshots and excludes the original appointment. A failed reschedule rolls back without changing the original.

The database installs `btree_gist` and enforces:

```sql
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(blocked_start, blocked_end, '[)') WITH &&
) WHERE (status = 'confirmed')
```

Half-open ranges permit adjacent intervals. Cancelled appointments release capacity. Checks also enforce valid statuses, nonnegative snapshots, and exact agreement between start, duration, end, and blocking buffers. Foreign keys preserve historical records; there are no destructive cascades. Indexed staff/customer/start/status fields support calendar lookups. Booking, activity, notification and outbox writes commit together **before** the HTTP success response. PostgreSQL exclusion violations map to HTTP 409.

Customers can change only their own future confirmed bookings before the cancellation cutoff. Administrators can override the cutoff for future appointments. Staff can mark only assigned, ended, confirmed appointments completed or no-show. Schedule edits are rejected if they invalidate an existing confirmed visit.

## Authentication and security

Argon2 password hashes; short-lived JWT access cookies; random, hashed, seven-day refresh sessions; rotation; revocation; account-active checks; hashed single-use reset tokens with 30-minute expiry. Cookies use HttpOnly where applicable, SameSite=Lax, and configurable Secure flags. Cookie mutations require the double-submit CSRF header; supplied origins must exactly match configuration. Role and ownership checks run on the backend. Public registration always creates a customer.

Login/registration/reset endpoints have a bounded, per-process rate limiter (10 attempts per endpoint/client address per minute). The deployment uses one API worker. Behind Nginx the conservative limiter can apply to the proxy address; production deployments should configure trusted proxy handling and a shared rate limiter if scaled. Query values are parameterized. API response schemas exclude hashes, credentials and internal sessions.

For public hosting: configure HTTPS at your ingress, set `COOKIE_SECURE=true`, use a matching HTTPS `ORIGIN`, set `ENVIRONMENT=production`, and disable `SEED_DEMO`. The startup validator rejects insecure production cookies. No payment processing is implemented. Estimated booking value is never presented as collected revenue.

## Migrations, seed and API contracts

With the virtual environment active, from `apps/api`:

```sh
python -m alembic upgrade head
python -m alembic check
python -m scripts.seed
python -m scripts.export_openapi
python -m scripts.export_outbox
```

From the repository root:

```sh
npm run contracts
```

The outbox command exports database messages to `apps/api/outbox/*.json`, including password-reset links. This ignored folder contains sensitive development tokens. Email is **recorded locally, not sent**. There is no SMTP sender or scheduled reminder job in this version.

## Verification

```sh
npm run lint
npm run build
npm test
npm audit --audit-level=moderate
npx playwright install chromium
npm run test:e2e
```

Run frontend E2E tests with the API and Vite running and demo data seeded. On Windows, if the Chromium CDN is unavailable but Edge is installed:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

API tests require a **separate PostgreSQL database whose name ends in `_test`**. The integration fixture truncates and reseeds that database before each test, and refuses an unqualified database URL. Never point it to a database with real data.

PowerShell, from `apps/api`, after creating `sereno_test` with the same owner:

```powershell
$env:TEST_DATABASE_URL = ((Get-Content .env | Where-Object { $_ -like 'DATABASE_URL=*' }) -replace '^DATABASE_URL=','') + '_test'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
python -m alembic upgrade head
python -m pytest -q
python -m ruff check app scripts tests
python -m ruff format --check app scripts tests
Remove-Item Env:DATABASE_URL
Remove-Item Env:TEST_DATABASE_URL
```

POSIX equivalent, with the configured password/host/port:

```sh
export TEST_DATABASE_URL='postgresql+asyncpg://sereno:YOUR_PASSWORD@localhost:5432/sereno_test'
DATABASE_URL="$TEST_DATABASE_URL" python -m alembic upgrade head
python -m pytest -q
```

The pure scheduling tests can be run independently with `python -m pytest tests/unit/test_slots.py`. PostgreSQL-specific integration tests are never replaced with SQLite. E2E tests create fictional accounts/bookings and retain cancelled booking history. The hours-edit test restores the original schedule in a `finally` block.

## Upgrading an existing installation

Keep your existing `.env`, `DATABASE_URL`, PostgreSQL role and database. The new `sereno` defaults apply to fresh installations; changing the brand does not require renaming an existing database or recreating its Docker volume.

Run `python -m alembic upgrade head` from `apps/api`. The brand migration changes only the original studio name and contact-email defaults, preserving custom studio details, accounts, passwords and appointment history. Existing accounts keep their current credentials; the Sereno demo credentials above apply to a freshly seeded database.

Authentication cookies now use the `sereno_` prefix. Sign in again after upgrading. No account or booking is deleted by this change.
