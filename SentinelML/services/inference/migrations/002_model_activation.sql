CREATE TABLE IF NOT EXISTS active_models (
 organization_id uuid PRIMARY KEY,
 model_version text NOT NULL,
 checksum text NOT NULL,
 activated_at timestamptz NOT NULL,
 event_id uuid NOT NULL UNIQUE
);
