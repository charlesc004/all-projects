# Database ownership

One PostgreSQL server hosts three isolated databases and service-specific login roles. Public database access is revoked during initial provisioning. Each service receives only its database URL. There are no cross-service joins or internal table reads.

| Owner | ORM | Tables and relationships |
|---|---|---|
| Go | GORM | transactions (tenant + idempotency key unique), api_keys (SHA-256 key digest), outboxes (durably queued JSON events) |
| Rust | SeaORM | inference_results (source event and tenant transaction unique), scoring_outbox (scoring event publication state) |
| Rails | ActiveRecord | organizations → users, assessments, policies, alerts, cases, feedback, audit events; global model_versions; control_outboxes |

All primary keys are UUIDs; persisted timestamps use PostgreSQL timestamptz or Rails UTC conventions. Tenant and creation-time indexes support ordered pagination. Rails foreign keys protect local relationships, and unique alert/policy and case/alert indexes prevent repeated domain objects. User role and inference score checks are enforced in SQL as well as application validation.

Feature snapshots and model execution metadata live in the Rust result JSON. Rails persists a scoring projection in assessment JSON so it can display evidence without accessing the inference database. No sensitive payment credentials are accepted in the ingestion input shape.

Migrations are explicit commands. The ingestion API never synchronizes schema automatically. Go embeds SQL migration 001 and records its application in schema_migrations. Rust migration 001 uses idempotent CREATE statements. Rails uses normal ActiveRecord migrations. Future schema changes require new versioned migrations rather than modification of applied migrations.

Alert, case, and policy mutations use lock_version. The API requires the submitted version and returns 409 on stale writes. Cases enforce assignee membership in the current tenant. Audit and outgoing business events commit alongside case changes.

Retention is configuration metadata at present; deletion/archival scheduling is not implemented. Avoid assuming that the displayed retention interval automatically removes records.
