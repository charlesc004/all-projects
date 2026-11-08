# Deployment and operations

The local stack uses Docker Compose v2, PostgreSQL 17, Redis, Redpanda, separate Go/Rust/Rails processes, Next.js, Caddy, Prometheus and Grafana. Use approximately 8 GiB available RAM. Native development needs Go 1.27.3, Rust 1.88 with CMake/Clang, Ruby 3.3, Node 24 and Python 3.12+.

From the repository root:

```sh
cp .env.example .env
# Replace SECRET_KEY_BASE and INTERNAL_SERVICE_TOKEN with independent random secrets.
docker compose up -d --build
docker compose exec -T control bundle exec rails db:seed
python scripts/demo_traffic.py --count 100
python scripts/verify_pipeline.py
```

On Windows, Docker Desktop with WSL integration can run these commands from the repository root. If Docker Engine is installed inside a separate WSL distribution, run the commands from that distribution with the repository mounted and available.

Default gateway is http://localhost:8080. Set APP_PORT=8180 in your local .env if port 8080 is already occupied. Set SENTINEL_BASE_URL=http://localhost:8180 for the HTTP verifier and E2E_BASE_URL=http://localhost:8180 for Playwright. Demo traffic accepts `--url http://localhost:8180/ingest`.

Prometheus: http://localhost:9090. Grafana: http://localhost:3002 (admin / local-grafana-change-me unless GRAFANA_PASSWORD changes it). Gateway, Prometheus and Grafana bind to loopback; database, Redis, Kafka and internal services have no host ports. Override conflicting monitoring ports in your own Compose overlay.

Migration jobs run before services. Re-run explicitly:

```sh
docker compose run --rm ingestion-migrate
docker compose run --rm inference-migrate
docker compose run --rm control-migrate
```

`db:seed` requires DEMO_ENABLED=true and is intended for synthetic local use. Set DEMO_ENABLED=false and SECURE_COOKIES=true for a remote environment. Changing POSTGRES_PASSWORD in .env does not rotate existing PostgreSQL roles; initialization SQL runs only on a new volume.

Model bundles are immutable. Mount a new version below ml/artifacts, discover it in Model center, and activate the desired version. Prior versions use the same activation operation for rollback; no inference restart is required. In-flight records retain their execution version.

## Operational verification

```sh
docker compose ps -a
docker compose logs -f ingestion inference consumer control worker outbox
python scripts/verify_pipeline.py
# Observe committed consumer offsets/lag:
docker compose exec redpanda rpk group describe sentinel-inference-v1
# Inspect a bounded dead-letter batch:
docker compose exec -T redpanda rpk topic consume transaction.received.v1.dlq -n 10 -f '%v\n' > reviewed-dlq.jsonl
python scripts/replay_dlq.py --input reviewed-dlq.jsonl --topic transaction.received.v1 --limit 10
# Publish only after correcting the underlying cause and reviewing the batch:
python scripts/replay_dlq.py --input reviewed-dlq.jsonl --topic transaction.received.v1 --limit 10 --publish
bash scripts/backup.sh
```

The replay CLI validates schemas, limits batches to 100, preserves IDs and defaults to validation only. It does not reset consumer offsets. Poison-message tests deliberately use isolated test events and confirm exact original bytes reach the DLQ after bounded retries. Outbox records remain durable while brokers are unavailable.

Backups are verified PostgreSQL custom archives under ignored backups/. Treat them as sensitive; use encrypted storage and a documented off-machine retention policy. `pg_restore --list < file.dump` validates the archive directory. Restore into a separately named database first, validate schema/row counts, then follow the organization's cutover procedure. Do not erase application volumes to repair a failed deployment.

Prometheus scrapes actual service metrics, including HTTP/inference latency, throughput, model loading, sampled inference partition lag, publish failures, policy counts, feedback and control outbox backlog. Rules in infrastructure/prometheus/alerts.yml define operational alerts; delivery to an external paging service requires an operator's Alertmanager configuration. The provisioned Grafana dashboard uses these actual series. Shared service telemetry in the application is restricted to admin/risk_manager; model drift and reviewed outcomes remain tenant scoped. Empty rate windows appear unavailable until sufficient scrapes exist.

## Kubernetes

infrastructure/kubernetes/services.yaml contains the namespace, deployments/services, all Rails process roles, migration Jobs, resource limits/probes, disruption budgets, ingestion HPA, artifact/backup PVCs, gateway ConfigMap, ingress/TLS reference and application network isolation. It references managed PostgreSQL/Redis/Kafka; it does not install or operate those data services.

Before applying:

1. Publish the four images to your registry and replace image names/tags with immutable digests. Provision three databases with distinct service roles, Redis and Kafka topics matching Compose.
2. Create the namespace and actual secrets matching secrets.example.yaml using your secret manager. Never apply the placeholder examples as credentials.
3. Set dependency URLs, ALLOWED_HOSTS and your real domain in the ConfigMap. Configure authenticated TLS for managed dependencies. Amend egress policy with their exact external CIDRs/ports when they are outside the namespace.
4. Provision storage supporting the requested ReadWriteMany access. Populate validated-model-artifacts with versioned artifacts before starting inference. Artifact ownership must allow UID 10001 to read them.
5. Create the contract ConfigMap: `kubectl -n sentinelml create configmap sentinel-contracts --from-file=contracts/events`. It is mounted under /contracts/events.
6. Run and wait for the three migration Jobs before applying/unpausing application deployments. For each release use uniquely named Jobs or explicitly replace completed migration Jobs.
7. Configure the ingress class, domain and existing TLS Secret sentinelml-tls through your certificate workflow. Provision monitoring namespace access, alert delivery, encrypted backups and restore drills.
8. Validate readiness, pipeline verification, RBAC, selected model and broker recovery against that environment before directing real traffic.

No Kubernetes cluster, managed dependency, external ingress or TLS certificate has been deployed during local verification. The manifests are packaging, not evidence of a production rollout. Sidekiq/consumer process probes detect dead processes; monitor broker lag, retries and publisher progress to detect live but stalled workers. Organization membership currently supports one organization per user.

The optional backup.yaml CronJob runs verified custom-format database backups daily at 02:15 UTC. Supply backup-secrets with PGHOST, PGPORT, PGUSER, PGPASSWORD and PGSSLMODE=verify-full plus the provider CA configuration. The backup role needs read access to the three databases. Use encrypted persistent/off-machine storage and an operator retention policy; the job does not delete archives automatically.
