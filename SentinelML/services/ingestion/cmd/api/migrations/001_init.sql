CREATE TABLE transactions (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL,
 idempotency_key text NOT NULL, payload_hash text NOT NULL,
 account_token text NOT NULL, merchant text NOT NULL,
 amount numeric(18,2) NOT NULL CHECK(amount>0 AND amount<=10000000),
 currency varchar(3) NOT NULL, country varchar(2) NOT NULL,
 account_age_days double precision NOT NULL, velocity_hour double precision NOT NULL,
 device_trust double precision NOT NULL CHECK(device_trust BETWEEN 0 AND 1),
 distance_km double precision NOT NULL, failed_attempts double precision NOT NULL,
 new_device boolean NOT NULL, country_mismatch boolean NOT NULL, created_at timestamptz NOT NULL,
 UNIQUE(organization_id,idempotency_key)
);
CREATE INDEX transactions_tenant_time ON transactions(organization_id,created_at DESC,id);
CREATE TABLE api_keys(id uuid PRIMARY KEY, organization_id uuid NOT NULL, digest text NOT NULL UNIQUE, revoked boolean NOT NULL DEFAULT false);
CREATE TABLE outboxes(id uuid PRIMARY KEY, organization_id uuid NOT NULL, payload jsonb NOT NULL,
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL, published_at timestamptz, created_at timestamptz NOT NULL);
CREATE INDEX pending_outboxes ON outboxes(available_at,created_at) WHERE published_at IS NULL;
