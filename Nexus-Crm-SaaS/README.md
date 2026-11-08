# Nexus CRM

A full-stack, organization-scoped CRM built with Next.js App Router, React, strict TypeScript, NestJS, Prisma, and PostgreSQL. The web application talks to a versioned REST API; all CRM records, activities, sessions, notifications, and reporting inputs are persisted in PostgreSQL.

## Requirements

- Node.js 22.9 or newer (developed with Node.js 24), npm 11.21.1 or newer.
- Docker Desktop with Compose for PostgreSQL and Redis, **or** the included local PostgreSQL runner.
- No paid services or external accounts are required.

## Quick start

Run from this project directory:

```sh
npx --yes npm@11.21.1 install
npm run setup:env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [Nexus CRM](http://localhost:3000). The NestJS API runs on port 4000. The frontend proxies `/api/v1/*` to the API so authentication cookies remain on the web origin.

The pinned npm command works without changing your globally installed npm. Use `npm install` directly when your npm is already 11.21.1 or newer. This version is used to resolve workspace security overrides consistently. The root `allowScripts` policy permits the locked native build/database packages and disables optional Scarf telemetry; review that list when updating native dependencies.

Next.js development and builds explicitly use its supported Webpack mode. Turbopack's PostCSS worker failed to establish its IPC connection on this Windows host; Webpack preserves the App Router and avoids that worker path. Jest stores its disposable transform cache inside ignored workspace `.cache/` directories so restricted Windows temporary-directory permissions do not prevent tests from running.

If Docker is unavailable, run the following in a separate terminal instead of `docker compose up -d`:

```sh
npm run db:local
```

This starts a genuine PostgreSQL 17 server bound to `127.0.0.1:5432`, creates `nexus` and `nexus_test`, and persists data under the ignored `.postgres/` directory. The bundled binary is downloaded by the `embedded-postgres` development dependency; its JavaScript wrapper uses a prerelease version. Ctrl+C stops the server. Do not start Docker PostgreSQL and this runner on the same port. Redis is optional for a single local API process; an unavailable Redis instance produces a warning and a per-process rate limiter is used.

`npm run setup:env` copies `.env.example`, generates a unique signing secret, creates `apps/api/.env`, and creates `apps/web/.env.local`. It never overwrites existing environment files. If configuration changes later, edit the relevant files together. Secrets are ignored by Git and never placed in browser environment variables. `API_URL` in `apps/web/.env.local` is server-side proxy configuration, not a database connection.

## Local demo accounts

| Role                 | Email                | Password         |
| -------------------- | -------------------- | ---------------- |
| Administrator        | `admin@nexus.demo`   | `NexusDemo!2026` |
| Manager              | `manager@nexus.demo` | `NexusDemo!2026` |
| Sales representative | `sales@nexus.demo`   | `NexusDemo!2026` |

These are intentionally public, local demonstration credentials. Never seed them into a public or production database. The seed includes fictional contacts and companies, valid linked CRM records, tasks, notes, activities, and notifications. Seed dates use `SEED_REFERENCE_DATE` so the demonstration is reproducible; change it when presenting in a different month. Reseeding replaces records and resets demo passwords within the explicitly identified demonstration organization, including changes made during a demo; it preserves unrelated organizations.

## Project structure

```text
.
├── apps/
│   ├── web/                  # Next.js frontend
│   │   └── src/
│   │       ├── app/          # Auth and protected dashboard routes
│   │       ├── components/   # Layout, charts, forms, Radix UI primitives
│   │       ├── features/crm/ # Lists, record details, pipeline, tasks, settings
│   │       ├── hooks/
│   │       ├── lib/          # Typed API client, session hooks, formatting
│   │       └── providers/    # TanStack Query and toast providers
│   └── api/
│       ├── prisma/           # Normalized schema, SQL migrations, seed
│       ├── src/              # Auth, security, CRM services, reports, health
│       └── test/             # Jest tests and PostgreSQL HTTP integration tests
├── packages/shared/          # Public TypeScript contracts and enums
├── scripts/                  # Safe environment setup and local DB runner
├── tests/e2e/                # Playwright user journeys
├── docker-compose.yml
└── playwright.config.ts
```

Database access is confined to the API. Shared contracts contain no secrets or database code. React Hook Form and Zod validate browser inputs; the API independently validates and allowlists request fields. TanStack Query invalidates affected data after mutations. Radix UI dialogs and menus provide keyboard interaction and focus management. Lists keep searchable filters in the URL.

Styling uses Tailwind CSS 4 throughout. `apps/web/src/app/globals.css` contains only the Tailwind import, theme tokens, and animation keyframes. Shared utility compositions live in `components/ui/styles.ts` and `features/crm/modules.styles.ts`; CSS Modules and React inline style objects are not used. `cn` combines conditional utilities and resolves overrides, while `buttonVariants` and `Badge` expose reusable variants. The `nexus-*` and `crm-*` marker classes only identify targets for Tailwind contextual variants; they have no custom CSS rules. Reusable `DataBar` charts accept continuous numeric data through SVG attributes.

The persistence and application layers already use Prisma ORM and NestJS classes with dependency injection. Browser transport is an injectable `ApiClient` class, with one refresh lock shared by JSON requests and exports. React views reuse composable components, hooks, configurable record lists/details, and schema-driven forms. [Architecture and reuse](docs/architecture.md) describes the extension points.

The lockfile pins the installed dependency tree. Two scoped overrides apply security fixes without changing framework majors: Prisma configuration uses `deepmerge-ts@8.0.0` ([advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)), and Swagger uses `js-yaml@5.4.1` ([advisory](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm)). Recheck these overrides when updating Prisma or Swagger; `deepmerge-ts` 8 changes Map merging, while this project's Prisma configuration uses ordinary objects. Prisma generation, migrations, application startup, and tests are checked with the overridden dependencies.

On October 19, 2026, the production dependency audit (`npm audit --omit=dev`) reported zero vulnerabilities. The complete development tree still reports 37 findings (32 high and 5 moderate, counting transitive dependents), originating from unpatched [`braces`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [`sprintf-js`](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) advisories in Jest/ESLint tooling. These packages are not used for CRM request input. Do not pass untrusted glob patterns or format strings to development tools; recheck upstream releases before using the toolchain in CI with untrusted inputs. The project does not claim that its entire dependency tree is advisory-free.

## Commands

| Command                    | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `npm run dev`              | Frontend and API in watch mode                               |
| `npm run build`            | Shared type check, API compilation, Next.js production build |
| `npm start`                | Run the built web and API applications                       |
| `npm run type-check`       | Check workspace TypeScript                                   |
| `npm run lint`             | ESLint across API, shared contracts, and frontend            |
| `npm run format`           | Format source with Prettier                                  |
| `npm run format:check`     | Verify formatting                                            |
| `npm test`                 | Backend Jest unit tests                                      |
| `npm run test:web`         | API client session, mutation, and export regression tests    |
| `npm run test:integration` | Migrate a dedicated test DB and test real HTTP/DB workflows  |
| `npm run test:e2e`         | Browser workflows against running seeded web/API services    |
| `npm run db:generate`      | Generate the Prisma client                                   |
| `npm run db:migrate`       | Apply checked-in migrations without resetting data           |
| `npm run db:seed`          | Populate the local fictional demonstration                   |
| `npm run db:studio`        | Inspect the configured database with Prisma Studio           |
| `npm run db:local`         | Start local PostgreSQL without Docker                        |

For schema development, use `npx prisma migrate dev --name descriptive_change` from `apps/api`, then commit the generated migration. Review generated SQL: the integrity migration includes partial unique indexes, check constraints, and composite tenant foreign keys beyond Prisma's ordinary relations; preserve these when evolving the schema. Use `migrate deploy` in deployed environments. Never run destructive schema resets against a live database.

## API and authentication

The API prefix is `/api/v1`. Interactive OpenAPI documentation is available at [API docs](http://localhost:4000/api/docs). The health endpoint is [health](http://localhost:4000/api/v1/health).

- Auth: `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/auth/forgot-password`.
- CRM: `/leads`, `/contacts`, `/companies`, `/deals`, `/tasks`; list, create, detail, update, and archive/delete operations.
- Workflows: `/leads/:id/convert`, `/deals/:id/stage`, `/notes`, `/activities`.
- Reporting: `/dashboard/summary`, `/reports/sales`, `/reports/export`.
- Workspace: `/notifications`, `/users`, `/settings/profile`, `/settings/organization`.

The browser stores a 15-minute access JWT and a rotating seven-day refresh token in HttpOnly, SameSite=Lax cookies. Production sets Secure. Refresh tokens are stored only as SHA-256 hashes. Reuse of an old refresh token revokes its session family. Logout revokes refresh sessions and clears cookies. Passwords are bcrypt hashed. Role and active status are reloaded from the database on each authenticated request, so changing client state cannot grant privileges.

Every state-changing request must send `x-nexus-csrf: 1`. CORS permits the configured web origin, and a mismatching Origin is rejected. A custom header prevents cross-site form submissions. The frontend client sends it automatically. API clients without an Origin must still send the header. Do not expose this API with permissive credentialed CORS. Login is rate limited by IP and normalized email; Redis shares counters between API processes when available.

Errors use `{ statusCode, message, requestId? }` without internal database errors or stack traces. CRM and notification lists return `{ data, meta: { page, pageSize, total, totalPages } }`. Team members return an array; record notes and timelines return the newest 100 entries as arrays. Pagination and report exports are bounded. Reports neutralize spreadsheet formula prefixes in exported CSV values.

## Permissions and tenancy

| Action                                                 | Admin        | Manager      | Sales representative |
| ------------------------------------------------------ | ------------ | ------------ | -------------------- |
| Read own CRM records and assigned tasks                | Yes          | Yes          | Yes                  |
| Read other members' CRM records and tasks              | Yes          | Yes          | No                   |
| Create CRM records                                     | Yes          | Yes          | Assigned to self     |
| Update CRM records / convert leads / change deal stage | Any owner    | Any owner    | Own records          |
| Archive leads, contacts, companies, deals              | Yes          | Yes          | No                   |
| Complete, reopen, delete tasks                         | Any assignee | Any assignee | Own tasks            |
| Add record notes                                       | Yes          | Yes          | Own records          |
| Dashboard                                              | Organization | Team         | Own records          |
| Reports and report CSV                                 | Yes          | Yes          | No                   |
| Edit own profile and password                          | Yes          | Yes          | Yes                  |
| Read organization settings and team directory          | Yes          | Yes          | No                   |
| Edit organization                                      | Yes          | No           | No                   |
| Add team members / assign roles                        | Yes          | No           | No                   |
| Read/mark personal notifications                       | Own          | Own          | Own                  |

A user's required organization foreign key and role form the membership model; each user belongs to one organization. Organization IDs come from the authenticated user, never from trusted client input. Record lookups, mutations, relations, notes, timelines, summaries, exports, owners, and assignees are checked against that organization. Cross-organization IDs return 404. Authorization is enforced by backend guards and services.

The organization is the manager's team boundary. Sales representatives see only CRM records they own and tasks assigned to them, including search results, record exports, related-record counts, and dashboard metrics. Another member's record ID returns 404, and submitted owner filters cannot expand access. Related records and conversion links are filtered independently; an assigned task can still be completed when its linked CRM record is restricted. A lead matching another member's contact or company must be converted by a manager. Sales users receive only themselves from the assignment-options endpoint and see profile/security settings; managers can read team and organization information, while account/role and organization changes remain administrator-only. Signing into another account clears cached application data.

## Business rules and metric definitions

- Leads, contacts, companies, and deals are archived; tasks can be deleted. Archived records are omitted from ordinary lists and metrics.
- Lead conversion creates or reuses tenant-scoped company/contact records and optionally creates a deal in one transaction. Converted leads are locked during conversion to prevent duplicate concurrent conversions. Repeated conversion does not create additional records.
- Open pipeline stages are Qualification, Discovery, Proposal, and Negotiation. Won and Lost are terminal. A lost reason is required for Lost. Closing sets `closedAt`; closed deals cannot be reopened through the API.
- Task completion sets `completedAt`; reopening clears it. Assignments generate persisted notifications and meaningful mutations generate persisted activity records.
- Total leads and contacts and open pipeline count/value are current active-record totals. They are not constrained by a revenue date filter.
- Won revenue is the sum of active Won deals whose `closedAt` lies within the selected inclusive date range, in USD. Revenue charts use the same close dates and monthly UTC buckets. No invented growth comparison or forecast is shown.
- Conversion rate is converted active leads created in the selected period divided by all active leads created in that period, multiplied by 100; an empty denominator produces zero. Source/status reports use the same lead creation cohort.
- Win rate is Won divided by Won plus Lost for deals closed within the selected range, multiplied by 100; an empty denominator produces zero.
- Reports and dashboard use the same backend calculations. The default date window begins on the first UTC day five months ago and ends now. Pipeline distributions and each member's total deal count are current snapshots; team revenue uses the selected close-date period and includes inactive owners to preserve historical totals. The UI provides date range selection. Lead sources/statuses and pipeline distribution are based on actual records.

## Testing

See [the verification record](docs/verification.md) for commands actually executed, final results, resolved failures, and verification limits.

Unit tests cover validation, authorization helpers, authentication, revenue calculations, CSV escaping, and security rules. Integration tests boot the actual configured NestJS application and use real PostgreSQL with two isolated organizations. They exercise authentication, CSRF, tenant isolation, assignment/role restrictions, CRUD, search/sort/pagination, conversion, closed deal transitions, task events, notes, notifications, dashboard/report consistency, and refresh-token replay.

Set `DATABASE_URL_TEST` in root `.env` to a dedicated database ending in `_test` or a schema starting with `test_`. The local runner creates `nexus_test` automatically. With Docker, create it once using `docker compose exec postgres createdb -U nexus nexus_test`. Integration tests deploy migrations, create uniquely named tenants, and remove only their own fixtures. They never reset the entire database. Do not run against production.

Start the migrated application before `npm run test:e2e`. The default browser setup creates a uniquely named organization and account in the configured local database, then removes that tenant and its records after testing. It does not reset the demo organization. Browser tests cover sign-in/sign-out and protected routes, invalid credentials/forms, lead create/search/edit/archive/conversion, notes, persistent deal movement and closure, task completion/reopening/deletion, and mobile navigation. Install a browser with `npx playwright install chromium` if needed, or set `PLAYWRIGHT_EXECUTABLE_PATH`. The configuration can reuse the Chromium already bundled with this workstation. `E2E_BASE_URL` overrides the local URL. Setting `E2E_EMAIL` opts into an existing demo account instead of creating isolated fixtures; its password must be `NexusDemo!2026`. Keep root and API `DATABASE_URL` configuration aligned for browser fixture provisioning.

## Deployment considerations and limitations

This is a portfolio application with real persistence and backend security boundaries; local success does not establish production readiness. Before exposing it publicly:

- Use HTTPS, unique strong secrets, private PostgreSQL/Redis networks, production backups with restore testing, and database credentials with least privilege. Use an appropriate managed secret store.
- Replace demonstration users, review organization onboarding and administrator provisioning, and configure verified email delivery and a complete password reset service. The local forgot-password screen gives a generic response; it does not deliver email or issue reset links.
- Configure a shared Redis instance for multiple API replicas and monitor limiter availability. The development fallback is process-local and does not share counters between servers.
- Add structured observability, alerting, dependency patching/auditing, load testing, retention policies for sessions and activities, and deployment-specific security review.
- Access JWTs expire after 15 minutes; clearing/revoking refresh tokens does not invalidate a copied access JWT before that expiry. Add session-version revocation if immediate global logout is required.
- Each user currently belongs to one organization. There is no public signup, organization switcher, invitations by email, realtime push, attachments, or configurable custom sales pipeline.
- Currency is USD by default and formatting is centralized. Exchange-rate conversion and full translated catalogs are outside this implementation.

## Troubleshooting

**Database unavailable:** Start Docker services or `npm run db:local`, check port 5432, and verify `DATABASE_URL` in `apps/api/.env`. Run migrations before the seed or API. `db:local` logs startup failures without discarding stored data.

**Missing signing secret / invalid environment:** Run `npm run setup:env` or fill in `JWT_ACCESS_SECRET` with at least 32 random characters. Existing files are preserved, so remove placeholder values manually. Production requires an HTTPS `WEB_ORIGIN`.

**Redis warning:** Expected if using only the local PostgreSQL runner. Login rate limiting remains enabled for that API process. Start Compose Redis to use distributed counters.

**Unable to sign in / 403 origin:** Use `http://localhost:3000` consistently and match `WEB_ORIGIN`. `127.0.0.1` and `localhost` are different origins. Ensure the API and frontend run together.

**Ports occupied:** Change the API port and frontend `API_URL` together. A different web origin also requires updating `WEB_ORIGIN`. For local PostgreSQL use `LOCAL_POSTGRES_PORT` and update both database URLs.

**Empty charts:** Select a range containing seeded close dates, or update `SEED_REFERENCE_DATE` and rerun the local seed. Metrics never fall back to fabricated data.
