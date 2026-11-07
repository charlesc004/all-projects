# Executed verification and acceptance evidence

Date: 2026-11-02. Checks below were executed locally; CI definitions and deployment manifests are not substitutes for execution.

## Working distributed path

The real Go → Redpanda → Rust ONNX → Rails policies → alert/case → analyst feedback path passed public HTTP verification. No API response mocking or direct insertion of transaction/assessment/alert/case records was used. One recorded transaction is 7f524b34-374f-45e4-89c4-839d85c77932, investigated as case fca9fab4-9256-4037-8c18-16cee41db91e.

`scripts/verify_pipeline.py` also passed organization-scoped idempotent replay, conflicting replay (409), real model output, policy history, case optimistic concurrency, feedback export, CSV reporting, live v2 activation, repeated activation command, v1 rollback, key creation/rotation/revocation, viewer mutation denial and logout revocation. The final patched-image rerun also passed (transaction e63a963f-1c7d-44e8-a4cb-de801e3b0291; case 0b740b6f-aef3-4562-9912-67198bbb9c71).

`scripts/verify_streaming.py` passed durable acceptance while the Compose project's broker was stopped, scoring after restart, duplicate Kafka event replay without duplicate projection, and Rust/Rails poison-message handling. Both consumers exhausted bounded retries and durably published the exact original payload bytes to their DLQs. A recorded recovered transaction is b4cbba71-4901-45d2-9195-4bc6347699c8. Broker restart is protected by a finally block in the verifier.

## Language and persistence checks

| Check | Executed result |
|---|---|
| ML and JSON contracts | 9 pytest tests passed; real training, ONNX checker/runtime, sklearn parity, temporal data, feature order, drift, immutable versions, imputation and feedback curation |
| Python lint/format | Ruff checks and formatting passed |
| Go 1.27.3 | Production build, go vet and unit tests passed with patched dependencies |
| Go real PostgreSQL/Redis integration | 2 tests passed: atomic/idempotent acceptance, tenant isolation, strict payloads, authentication and rate limiting |
| Rust 1.88 | Locked release build, cargo fmt, strict Clippy and 3 ordinary tests passed, including real ONNX scoring |
| Rust dedicated PostgreSQL integration | 1 test passed: concurrent duplicates, single result/outbox, ownership rejection and tenant isolation |
| Rails 8 / Ruby 3.3 / Puma 7.2.1 | Migrations and all 25 RSpec examples passed against real PostgreSQL/Redis |
| Rails coverage | RBAC/tenant isolation, duplicate scoring, policy DSL, case workflow, model activation, PSI, profile/member/session operations, notifications, retention safety and atomic alert bulk updates |
| Frontend | ESLint with zero warnings, strict TypeScript, 3 Vitest tests and Next.js production build passed |
| Browser | Live transaction/investigation/feedback and live model/admin/responsive workflows passed; the complete Playwright suite passed all 4 tests (2 live, 2 isolated) |
| Configuration | 13 YAML files parsed successfully; all 8 application workloads checked; promtool validated the live config and 6 alert rules |
| Backups | Custom archives of all three service databases created and validated with pg_restore --list |

The default Rust suite intentionally excludes its database test unless TEST_DATABASE_URL points at a dedicated database. The explicit integration run above executed it successfully; it is not being counted as passed merely because it was skipped in the unit suite.

## Dependency remediation

- Rails JSON is constrained below 3.0 for Rails compatibility; connection_pool is pinned to the Sidekiq 7-compatible 2.5 line. Runtime tmp/log ownership is fixed for non-root execution. Puma is upgraded to 7.2.1 for the discovered PROXY-protocol advisories.
- Rust uuid is pinned to a release supported by the selected compiler. ort rc.10 uses the explicitly packaged official ONNX Runtime 1.22.0 shared library; the real library/model tests passed. SeaORM default features are disabled; only PostgreSQL support is enabled.
- Go dependencies were upgraded to the advisory fix versions: Chi 5.4.0, OTel 1.45.0, pgx 5.9.2, compress 1.18.7, x/crypto 0.56.0, x/sys 0.47.0 and x/text 0.41.0. The production toolchain is Go 1.27.3.
- npm audit reports zero known vulnerabilities after upgrading Vitest to 4.1.12 and overriding the vulnerable minimatch versions used by lint tooling. Actual lint, unit, type and production checks passed with the override.
- pip-audit reports no known vulnerabilities after upgrading the workspace-local pip to 26.2.2.
- OSV checked the selected Rust graph plus Ruby and Go module locks. Its remaining module-level result is GO-2026-5932 for unmaintained OpenPGP, which ingestion does not import. Actual govulncheck reachability/standard-library analysis completed successfully with zero findings (221 JSON messages, no finding entries).
- RUSTSEC-2023-0071 concerns optional RSA/MySQL packages retained in the SQLx lockfile. The captured production cargo tree contains neither rsa nor sqlx-mysql. This is a graph-specific assessment; enabling those features requires a fresh security review.

Version scanners do not establish exploitability or certify an application. The additional Trivy filesystem scan is configured in CI and was not run locally; no independent penetration test or production security certification is claimed.

Prometheus reported all three application scrape targets up; Grafana reported database health ok. Model-loaded telemetry is 1. Native librdkafka statistics now replace blocking watermark sampling for consumer lag. A real 100-transaction demonstration batch was accepted through Go, not inserted into databases.

## Reproduce the isolated checks

Run from the repository root with Docker:

```sh
# Rust lint, actual model tests, then dedicated database integration:
docker build --target test -f services/inference/Dockerfile -t sentinelml-inference-test-runner .
docker compose -f infrastructure/docker/compose.rust-test.yml up --abort-on-container-exit --exit-code-from tests
# Go vet/unit/contract tests and dedicated PostgreSQL/Redis integration:
docker build --build-context contracts=./contracts --target integration-test -t sentinelml-ingestion-test-runner services/ingestion
docker compose -f infrastructure/docker/compose.go-test.yml up --abort-on-container-exit --exit-code-from tests
# Rails source is bind-mounted into the built control image:
docker compose build control
docker compose -f infrastructure/docker/compose.test.yml up --abort-on-container-exit --exit-code-from rails
# Actual deployment verification:
SENTINEL_BASE_URL=http://localhost:8180 python scripts/verify_pipeline.py
SENTINEL_BASE_URL=http://localhost:8180 python scripts/verify_streaming.py
```

For an existing Chrome installation, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to its executable path; otherwise install Playwright Chromium. Configure E2E_BASE_URL to match the running gateway port.

## Actual model evaluation

The committed v1 synthetic holdout has precision 0.9357429719, recall 0.9831223629, F1 0.9588477366, ROC-AUC 0.9996399136 and PR-AUC 0.9954940789; confusion [[3347,16],[4,233]]. v3 records actual forest feature importance and separate measured results. These are synthetic results only; historical v1/v2 manifests are preserved. Training refuses version overwrite.

## Deployment limits

Kubernetes manifests have been parsed and reviewed but not applied to a cluster. Managed dependencies, real TLS/domain/secrets, alert routing, encrypted/off-machine backups, restore/cutover drills and production load testing require operator configuration. The verified local workload is not a throughput SLA. Users belong to one organization; invitations, MFA/SSO and self-service password recovery are outside this demonstration. Notifications are in-app. SHAP is optional and not implemented; observed indicators and forest importance are clearly distinguished from per-transaction explanations. Go exports real OTel spans and W3C context is propagated through event envelopes/headers; this is not a claim of exported spans from every backend.

Screenshots named live-* show the actual running application. Intercepted login/empty/error screenshots are test evidence, not evidence of distributed processing. An earlier standalone Windows rustfmt command failed due to missing compiler DLLs; its masked exit was corrected. All Rust formatting/build/test results above come from the working Linux toolchain.

Final operational smoke check passed with 110 v1 feature observations, measured PSI, consumer lag 0, model-loaded 1, all 3 scrape targets up, and Grafana health ok. [Machine-readable evidence](verification-evidence.json) records the final run; telemetry is a point-in-time observation, not a throughput guarantee.

Dependency-check commands used here include `npm audit`, `python -m pip_audit`, and (from services/ingestion) `go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./...`. The Go scanner reported toolchain go1.27.3 and symbol-level source analysis. To reproduce selected-graph OSV checks, build the Rust test runner, export `/build-artifacts/active-rust-dependencies.txt` from that image into `.tools/active-rust-dependencies.txt`, then run `python scripts/audit_dependencies.py`. Its module-level OpenPGP result remains visible; reachability analysis establishes that the affected package is not used.


## Analyst interface and demo-access verification

The later VECTOR interface pass on 2026-11-02 completed the production frontend build, zero-warning ESLint, strict TypeScript and 3 frontend unit tests. All 7 Playwright tests passed on the running local stack, including credential-free demo access, CSRF rejection without a token, normal sign-out, responsive navigation, the transaction-to-investigation journey, administration and isolated empty/error states.

The Rails suite passed 29 examples against the isolated PostgreSQL/Redis test environment. Demo-access coverage includes disabled mode, the fixed demo tenant, normal revocable sessions, disabled members and rejection of a matching email owned by another tenant.

All ten application sections were additionally inspected at desktop, tablet and mobile widths (30 screen/viewport combinations), with no application sidebar, runtime JavaScript errors or horizontal page overflow. The selected product captures are available in [images](images/).
