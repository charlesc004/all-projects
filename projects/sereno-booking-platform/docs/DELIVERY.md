# Validation and scope

Final local review: 20 October 2026.

## Sereno rebrand — 22 October 2026

The application, package namespaces, API title, authentication cookies, demo fixtures, CI configuration, environment defaults, favicon and documentation now use Sereno. All six README screenshots were captured again from the running application.

Validation: **37 PostgreSQL-backed tests, 7 frontend unit tests and 8 Playwright tests passed**, along with production build, strict TypeScript, lint/format checks and Alembic drift checking. The additional integration test verifies forward/reverse studio-brand migration, preservation of custom settings, unchanged account credentials and retained appointment counts.

Only the historical migration and its regression test retain the original brand literals. Existing database URLs and account credentials remain valid; see [upgrade instructions](DEVELOPMENT.md#upgrading-an-existing-installation). Repository hosting metadata and the local folder name are outside the application rebrand.

## Review changes

- Reworked the GitHub README around the product, six desktop screenshots, features, quick start and architecture. Moved operational details to the development guide.
- Removed six byte-identical screenshot copies. Desktop images now have one canonical location under `screenshots/desktop-six/`; browser tests write generated captures to ignored test results.
- Removed 39 overridden CSS declarations and 11 empty rules. Compared effective computed styles across four public routes at 390px and 1440px: no property values changed.
- Fixed same-page studio anchor navigation, returning to the homepage top and browser scroll restoration. The browser regression checks actual scroll position as well as the selected navigation item.
- Preserved inherited Nginx security headers for static assets by removing the child-level `add_header` override. Container runtime validation remains pending.
- Isolated CI browser data from the backend integration database, added explicit startup failure handling and retained failure artifacts. Contract drift checks cover both OpenAPI and generated TypeScript.
- Replaced `latest` dependency declarations with version ranges based on the installed lockfile. Aligned the FastAPI minimum with the validated version used for function-scoped transaction dependencies.
- Added a test-engine database guard before destructive fixture cleanup. Extended Git/Docker exclusions for environment variants, local reports and screenshot ZIP exports.

## Verification

| Check                                          | Local result                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| PostgreSQL-backed pytest suite                 | 36 passed                                                                        |
| Frontend Vitest                                | 7 passed                                                                         |
| Playwright using installed Microsoft Edge      | 8 passed in 49.7 seconds                                                         |
| Production build and strict TypeScript         | Passed                                                                           |
| Frontend formatting / Ruff lint and formatting | Passed                                                                           |
| Alembic drift check                            | No new upgrade operations                                                        |
| npm audit                                      | 0 reported vulnerabilities                                                       |
| Effective CSS comparison                       | No changes across 8 route/viewport combinations                                  |
| Git candidate scan                             | No detected private keys, provider tokens, environment files or files over 5 MiB |
| Docker / Nginx runtime / remote GitHub Actions | Not executed on this host                                                        |

Backend coverage includes competing bookings, direct database overlap rejection, reschedule rollback, appointment snapshots, cutoff policies, ownership and role checks, CSRF/origin rejection, session rotation/revocation, reset tokens, schedule conflicts and daylight-saving transitions. Browser coverage includes customer booking/rescheduling/cancellation, professional permissions, administrator hours editing, competing reservations, responsive navigation and public/admin axe checks.

The local runtime uses Node 24.11.1; two transitive generator packages request a newer release. New installations should use Node 24.15+ as documented. Edge is used locally because the Chromium download CDN returned HTTP 403; CI is configured to install Chromium.

## Remaining limits

1. Docker is unavailable on the development host. Compose, Dockerfiles and CI configuration have been reviewed, but container execution and remote CI have not been verified.
2. Email persists in a transactional development outbox and can be exported to ignored JSON files. SMTP delivery and scheduled reminders are not implemented.
3. The application serves one studio. Payments, subscriptions and multi-tenancy are outside its scope. Booking value is an estimate from appointment snapshots, not collected revenue.
4. Working intervals remain within one local date. Nonexistent DST interval boundaries are conservatively withheld; use a valid date-specific override when needed.
5. The shared day/week calendar groups visits into date columns and supports filters and detail actions. Drag-and-drop scheduling and proportional time-grid positioning are not implemented.
6. Catalog/professional selectors are capped at 100 records. Customer and appointment lists paginate; notification and exception views show the latest 100 records.
7. Rate limiting is local to one API worker. Trusted proxy handling, shared limits, HTTPS, backup/restore exercises, monitoring, load testing, assistive-technology testing and independent security review require deployment work.
8. Deactivation preserves existing appointments. Rescheduling requires the service and professional to remain active and eligible; resolve affected future visits before changing eligibility.
9. People, reviews and seed data are fictional. Local SVG artwork is used in place of photography.

See the [desktop gallery](../README.md#screenshots) and [development guide](DEVELOPMENT.md) for setup and implementation details.
