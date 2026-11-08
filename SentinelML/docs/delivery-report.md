# SentinelML delivery report

The repository contains the complete local implementation. [README](../README.md) supplies exact startup, migration, seed, login, training/export and language-test commands. [Complete file inventory](project-tree.txt) lists every deliverable file; generated dependencies, secrets and sensitive backups are excluded.

## Implemented behavior

The working pipeline durably accepts tokenized synthetic transactions in Go, publishes a transactional outbox to Redpanda, executes a real ONNX random forest in Rust, persists/publishes risk assessments, and applies tenant-scoped Rails policies to create alerts, cases, notifications and audit history. Analysts can assign cases, document evidence, record outcomes and export reviewed feature/label data. Duplicate delivery, optimistic concurrency, bounded retries, durable DLQs and broker recovery were tested.

The frontend provides the light Geist-based workspace, actual KPI/trend/risk charts, recent alerts/investigations, transaction search/date/risk filtering, alert search/bulk actions, case details/outcomes, policy editing/priority/execution history, model comparison/PR curves/confusion matrices/importance, PSI and reviewed metrics, shared service telemetry for authorized roles, in-app notifications, CSV reports, profile/org/member settings and one-time credential lifecycle flows.

## Language, architecture and database ownership

| Technology | Actual responsibility | ORM/database |
|---|---|---|
| Go, Chi, franz-go | Strict APIs, hashed keys, idempotency, Redis limiting, durable transaction/outbox and event headers | GORM; sentinel_ingestion |
| Rust, Axum, Tokio, rdkafka, ort | Schema/ownership validation, feature computation, real ONNX CPU inference, model cache/tenant activation, scoring/outbox/retries | SeaORM; sentinel_inference |
| Ruby, Rails, Karafka, Sidekiq, Pundit | Revocable sessions, organization roles, policies, business projection, alerts/cases/feedback, audits, notifications, retention, reports and model registry | ActiveRecord; sentinel_control |
| Python, NumPy/Pandas/scikit-learn/ONNX | Offline generation/import, chronological training, imputation, class weighting, validation cost selection, holdout metrics, ONNX parity/export, drift utilities and feedback curation | Versioned local datasets/artifacts; no replacement inference API |
| Next.js, React, strict TS | Real service-backed analyst and administrative workflows | Typed DTO API client and TanStack Query |

Database ownership is isolated by database/role, with UUID identifiers, indexes, constraints, explicit SQL/ActiveRecord migrations and transaction boundaries. Application services communicate through HTTP/events, not cross-service joins. Delivery is at least once with idempotent consumers, not exactly once.

## Model and measured results

100-tree class-weighted RandomForestClassifier, max_depth=10, min_samples_leaf=5. v1 uses 18,000 synthetic rows split chronologically into 10,800 training, 3,600 validation and 3,600 holdout. The validation threshold minimizes 20 × false negatives + 1 × false positives. Export uses a dense ONNX probability tensor; real ONNX outputs are checked against sklearn within 1e-5.

v1: precision 0.935743; recall 0.983122; F1 0.958848; ROC-AUC 0.999640; PR-AUC 0.995494; confusion [[3347,16],[4,233]]. v2 is a distinct trained bundle used in live activation/rollback checks. v3 adds actual forest feature importance; its measured precision is 0.933333, recall 0.954545 and PR-AUC 0.987798. These are synthetic holdout metrics, not real financial performance estimates.

## Run and inspect

Follow [deployment](deployment.md). Default startup is `docker compose up -d --build`, followed by `docker compose exec -T control bundle exec rails db:seed`. This workspace uses port 8180. Administrator: admin@sentinelml.example / LocalDemo!2026 unless the ignored environment configuration overrides it.

- Application: http://localhost:8180
- API documentation: http://localhost:8180/api-reference; [OpenAPI source](openapi.yaml)
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002; provisioned SentinelML transaction dashboard
- Model commands, feedback conversion and live activation: [ML pipeline](ml-pipeline.md)
- Exact per-language/container tests and executed evidence: [verification](verification.md)

## Practical limits

[Security](security.md), [deployment](deployment.md) and [verification](verification.md) distinguish verified local operation from external production responsibilities. No remote Kubernetes/TLS deployment, independent penetration test, production capacity SLA, real-data model validation or regulatory certification is claimed. Single-organization membership, in-app notifications and explicitly curated offline training are the delivered scope. SHAP, MFA/SSO, invitations and self-service recovery are not implemented. Version scans and build/test results do not eliminate the need for ongoing dependency/security review.
