ALTER TABLE api_keys ADD COLUMN name text NOT NULL DEFAULT 'Ingestion integration';
ALTER TABLE api_keys ADD COLUMN prefix text NOT NULL DEFAULT 'legacy';
ALTER TABLE api_keys ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE api_keys ADD COLUMN revoked_at timestamptz;
CREATE INDEX api_keys_tenant_created ON api_keys(organization_id,created_at DESC);
