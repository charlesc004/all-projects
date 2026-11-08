# Verification record

Verified on October 19, 2026, on Windows with Node.js 24.11.1, npm 11.21.1, PostgreSQL 17, and the checked-in dependency lockfile.

## Tailwind and reusable transport refactor

Reverified on October 19 after replacing custom CSS selectors and the CRM CSS Module with literal Tailwind utility compositions. The remaining stylesheet is the Tailwind entry point with theme tokens and animation keyframes. There are no React inline style objects in application source. Prisma models, migrations, API service logic, permissions, routes, and data were preserved. The browser transport now uses an injectable `ApiClient` class.

| Check                         | Result                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run type-check`          | Passed in all workspaces                                                                                                                                                              |
| `npm run lint`                | Passed with zero warnings                                                                                                                                                             |
| `npm run format:check`        | Passed                                                                                                                                                                                |
| `npm run build -w @nexus/web` | Passed; all existing routes generated                                                                                                                                                 |
| `npm run test:web`            | Six transport regressions passed                                                                                                                                                      |
| `npm run test:e2e`            | All six workflows passed against the running development frontend and API; 1.3 minutes                                                                                                |
| Built frontend verification   | Passed on a separate temporary production preview: dashboard, collapsed sidebar, mobile navigation, lead form, and lead detail; no browser page errors                                |
| Mobile containment            | Production dashboard body width was exactly 390px at a 390px viewport                                                                                                                 |
| Visual comparison             | Login, dashboard, CRM lists, deal board, tasks, notifications, reports, settings, and mobile navigation inspected; dashboard layout compared at 390, 640, 900, 1100, 1440, and 1600px |

Transport regressions cover shared refresh for concurrent requests, bounded retry behavior, invalid login, JSON/CSRF mutation behavior, empty responses, network failures, and a refresh shared between CSV download and JSON requests. The native Node.js TypeScript test runner emits experimental/module-detection warnings; all tests pass. No dependencies were added.

Computed layout, spacing, color, and typography samples were compared with pre-refactor captures. SVG data bars were visually checked separately after replacing their styled divs. Desktop and mobile screenshots of the built frontend, the form, and the detail screen were also inspected. The final source has no CSS Modules, `@apply` rules, or React inline styling. Earlier backend and database verification below remains the baseline because those layers were unchanged.

## Final checks

Development startup was also checked: `npm run dev` served `/login` and `/api/v1/health` with HTTP 200 responses. Temporary verification servers were stopped after checking; persisted PostgreSQL data was retained.

| Check                                         | Result                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| Fresh workspace dependency installation       | Passed; security overrides resolve to `deepmerge-ts@8.0.0` and `js-yaml@5.4.1` |
| `npm run db:generate`                         | Passed with Prisma 6.19.3                                                      |
| `npm run db:migrate`                          | Passed; both checked-in migrations applied, then no pending migrations         |
| `npm run build`                               | Passed for shared contracts, NestJS, and the Next.js App Router using Webpack  |
| `npm run type-check`                          | Passed in all three workspaces                                                 |
| `npm run lint`                                | Passed with zero allowed warnings                                              |
| `npm run format:check`                        | Passed                                                                         |
| `npm test`                                    | 22 tests passed in five suites                                                 |
| `npm run test:integration`                    | 16 tests passed against real PostgreSQL                                        |
| `npm run test:e2e`                            | Six tests passed against the built frontend and API; 25.8 seconds              |
| `npm audit --omit=dev --audit-level=moderate` | Passed; zero reported runtime dependency vulnerabilities                       |
| Full dependency audit                         | 37 development-tool findings remain; see below                                 |

## What the tests exercised

Unit tests exercise authentication failures and public fields, refresh-token hashing and replay revocation, authorization helpers, CSRF, strict input validation, production signing-secret validation, terminal deal transitions, revenue calculations, and CSV escaping.

HTTP integration tests boot the configured NestJS app and use two separate organizations in `nexus_test`. They cover unauthenticated and invalid requests, missing or foreign-origin CSRF headers, guessed foreign IDs, cross-tenant relationships and notes, owner and role restrictions, search/sort/pagination, transactional conversion and contact reuse, persistent deal stages, task assignments/completion/reopening, generated events, notifications, report/dashboard agreement, archival, last-administrator protection, and refresh-token replay. Fixtures are removed after the tests; the application database is not reset.

The six browser workflows cover protected-route redirects, invalid credentials, sign-in and sign-out, form validation, lead creation/search/edit/archive, persisted pipeline movement, required lost reasons and terminal deal locks, task creation/completion/reopening/deletion, quick-add URLs, notes, conversion and related contact/company/deal navigation, and mobile navigation and table containment. Browser fixtures use a temporary organization and are cleaned up after the run.

## Seed and visual verification

The seed was executed twice against the dedicated test database, with the main application database preserved. Both runs produced the same counts:

| Record        | Count |
| ------------- | ----: |
| Users         |     3 |
| Leads         |    24 |
| Contacts      |    18 |
| Companies     |    10 |
| Deals         |    18 |
| Tasks         |    12 |
| Notes         |    12 |
| Activities    |    24 |
| Notifications |     9 |

Deal/contact/company relationships were checked. The temporary seeded organization was removed afterward.

The live dashboard was visually inspected at 1440px desktop and 390px mobile widths. Charts showed persisted revenue, and the mobile dashboard had a 390px body width; wide tables scroll within their cards. A transient chart resize measurement was rechecked after layout settled and on a fresh mobile page. Login, global search, report filters, and mobile navigation were also inspected during implementation.

## Issues found and resolved

- Early login submission could reach a server-rendered form before its React handler was ready. Authentication forms now use POST and remain disabled until React Hook Form is ready, keeping credentials out of query URLs.
- A debounced search could replace the list URL after a detail link was clicked. Pending searches now cancel on navigation, and URL filters synchronize through supported history updates. The conversion browser regression passes.
- Conversion could create another contact for a different lead with the same email. Contacts now support multiple converted leads; conversion reuses the tenant's existing contact, and database constraints protect active email uniqueness and tenant relationships.
- The production environment validator accepted the exact example signing secret. The placeholder is now rejected and covered by a regression test.
- Older npm installations retained stale workspace dependency resolutions. A clean installation with npm 11.21.1 produced a complete, verified lockfile with the security overrides applied.
- Turbopack's PostCSS worker IPC failed on this Windows host. Development and production build scripts explicitly use the supported Webpack mode.
- Restricted Windows temporary-directory permissions prevented Jest transform-cache renames. Jest now uses ignored workspace `.cache/` directories. Some agent sandbox attempts to download Prisma checksums, run schema engines, or write Next.js prerender outputs failed; the final successful host checks are recorded above.

## Limits of verification

- Docker was not installed on the workstation. Database checks used the included real PostgreSQL runner. Docker Compose configuration is provided, but container startup was not executed here.
- A live Redis server was unavailable. The documented single-process rate-limit fallback was exercised; multi-replica Redis behavior was not load tested.
- No email delivery, password reset email, public deployment, backup restore, penetration test, or production load test was performed.
- The full development dependency audit reports 32 high and five moderate findings, counting transitive dependents of unpatched [`braces`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [`sprintf-js`](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) advisories in Jest/ESLint tooling. The runtime dependency audit is clean. These are documented remaining toolchain risks, not suppressed successful audit results.
- This verification supports a functional local portfolio application; it does not establish production readiness. Deployment requirements and remaining product limitations are listed in the root README.
