CREATE TABLE IF NOT EXISTS inference_results (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL,
 transaction_id uuid NOT NULL,
 event_id uuid NOT NULL UNIQUE,
 model_version text NOT NULL,
 score jsonb NOT NULL,
 created_at timestamptz NOT NULL,
 UNIQUE(organization_id, transaction_id)
);
CREATE INDEX IF NOT EXISTS inference_tenant_time ON inference_results(organization_id,created_at DESC,id);
CREATE TABLE IF NOT EXISTS scoring_outbox (
 id uuid PRIMARY KEY,
 payload jsonb NOT NULL,
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS scoring_unpublished ON scoring_outbox(created_at) WHERE NOT published;
