mod domain;
mod model;
mod registry;
mod store;

use anyhow::Context;
use axum::{
    extract::{Path as UrlPath, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use domain::{Event, Transaction};
use prometheus::{
    Encoder, Histogram, HistogramOpts, IntCounter, IntGauge, IntGaugeVec, Opts, TextEncoder,
};
use rdkafka::message::{Header, OwnedHeaders};
use rdkafka::{
    client::ClientContext,
    config::ClientConfig,
    consumer::{CommitMode, Consumer, ConsumerContext, StreamConsumer},
    producer::{FutureProducer, FutureRecord, Producer},
    statistics::Statistics,
    Message,
};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, DbBackend,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set, Statement, TransactionTrait,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{env, path::Path, sync::Arc, time::Duration};
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone)]
struct App {
    db: DatabaseConnection,
    registry: Arc<Mutex<registry::Registry>>,
    producer: FutureProducer,
    count: IntCounter,
    failures: IntCounter,
    latency: Histogram,
    internal_secret: Arc<str>,
    lag: IntGaugeVec,
}

struct LagContext {
    lag: IntGaugeVec,
}
impl ClientContext for LagContext {
    fn stats(&self, statistics: Statistics) {
        if let Some(topic) = statistics.topics.get("transaction.received.v1") {
            for (partition, state) in &topic.partitions {
                if *partition >= 0 && state.consumer_lag >= 0 {
                    self.lag
                        .with_label_values(&[&partition.to_string()])
                        .set(state.consumer_lag);
                }
            }
        }
    }
}
impl ConsumerContext for LagContext {}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter("info,sqlx=warn")
        .init();
    let db = Database::connect(env::var("DATABASE_URL")?).await?;
    if env::args().nth(1).as_deref() == Some("migrate") {
        db.execute_unprepared(include_str!("../migrations/001_init.sql"))
            .await?;
        db.execute_unprepared(include_str!("../migrations/002_model_activation.sql"))
            .await?;
        return Ok(());
    }
    let registry = registry::Registry::new(Path::new(
        &env::var("MODEL_DIR").unwrap_or("ml/artifacts/v1".into()),
    ))?;
    let internal_secret: Arc<str> = env::var("INTERNAL_SERVICE_TOKEN")?.into();
    anyhow::ensure!(
        internal_secret.len() >= 32,
        "INTERNAL_SERVICE_TOKEN must have at least 32 characters"
    );
    let brokers = env::var("KAFKA_BROKERS")?;
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &brokers)
        .set("message.timeout.ms", "5000")
        .set("enable.idempotence", "true")
        .create()?;
    let count = IntCounter::new("sentinel_inference_total", "Persisted model results")?;
    let failures = IntCounter::new("sentinel_inference_failures_total", "Processing failures")?;
    let latency = Histogram::with_opts(HistogramOpts::new(
        "sentinel_inference_duration_seconds",
        "ONNX inference latency",
    ))?;
    prometheus::register(Box::new(count.clone()))?;
    prometheus::register(Box::new(failures.clone()))?;
    prometheus::register(Box::new(latency.clone()))?;
    let lag = IntGaugeVec::new(
        Opts::new(
            "sentinel_kafka_consumer_lag",
            "Native Kafka consumer lag sampled by partition",
        ),
        &["partition"],
    )?;
    prometheus::register(Box::new(lag.clone()))?;
    let loaded = IntGauge::new(
        "sentinel_model_loaded",
        "Validated default model loaded and warmed",
    )?;
    loaded.set(1);
    prometheus::register(Box::new(loaded))?;
    let app = App {
        db,
        registry: Arc::new(Mutex::new(registry)),
        producer,
        count,
        failures,
        latency,
        internal_secret,
        lag,
    };
    let mut worker = tokio::spawn(consume(app.clone(), brokers));
    let mut publisher = tokio::spawn(publish(app.clone()));
    let routes = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/ready", get(ready))
        .route("/metrics", get(metrics))
        .route("/internal/model", get(metadata))
        .route("/internal/models", get(manifests))
        .route("/internal/models/activate", post(activate))
        .route("/internal/inference/test", post(test_inference))
        .route(
            "/internal/organizations/{organization_id}/retention",
            post(retention),
        )
        .layer(axum::extract::DefaultBodyLimit::max(16384))
        .with_state(app);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8082").await?;
    let http = axum::serve(listener, routes).with_graceful_shutdown(shutdown());
    // A dead worker must not leave a healthy-looking HTTP-only service running.
    tokio::select! {
        result = async { http.await } => { result?; },
        result = &mut worker => { result??; anyhow::bail!("Kafka worker unexpectedly stopped"); },
        result = &mut publisher => { result??; anyhow::bail!("outbox publisher unexpectedly stopped"); },
    }
    worker.abort();
    publisher.abort();
    Ok(())
}

async fn shutdown() {
    #[cfg(unix)]
    {
        let mut terminate =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("install SIGTERM handler");
        tokio::select! { _ = tokio::signal::ctrl_c() => {}, _ = terminate.recv() => {} }
    }
    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
}

async fn ready(State(app): State<App>) -> StatusCode {
    let producer = app.producer.clone();
    let broker = tokio::task::spawn_blocking(move || {
        producer
            .client()
            .fetch_metadata(None, Duration::from_secs(2))
    })
    .await;
    if app.db.ping().await.is_ok() && matches!(broker, Ok(Ok(_))) {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}
type HttpError = (StatusCode, Json<serde_json::Value>);
fn http_error(status: StatusCode, message: &str) -> HttpError {
    (status, Json(serde_json::json!({"error": message})))
}
fn authorize_internal(app: &App, headers: &HeaderMap) -> Result<(), HttpError> {
    let supplied = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .unwrap_or("");
    let expected = Sha256::digest(app.internal_secret.as_bytes());
    let actual = Sha256::digest(supplied.as_bytes());
    if expected
        .iter()
        .zip(actual.iter())
        .fold(0u8, |difference, (left, right)| difference | (left ^ right))
        != 0
    {
        return Err(http_error(
            StatusCode::UNAUTHORIZED,
            "invalid service credential",
        ));
    }
    Ok(())
}
async fn metadata(
    State(app): State<App>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, HttpError> {
    authorize_internal(&app, &headers)?;
    let mut registry = app.registry.lock().await;
    let default = registry.default_version.clone();
    registry
        .load(&default)
        .map(|model| Json(model.metadata.clone()))
        .map_err(|_| http_error(StatusCode::SERVICE_UNAVAILABLE, "model unavailable"))
}
async fn manifests(
    State(app): State<App>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, HttpError> {
    authorize_internal(&app, &headers)?;
    let items = app.registry.lock().await.manifests().map_err(|error| {
        tracing::error!(%error, "model manifest validation failed");
        http_error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "artifact registry contains an invalid bundle",
        )
    })?;
    Ok(Json(serde_json::json!({"items": items})))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Activation {
    organization_id: Uuid,
    model_version: String,
    command_id: Uuid,
    correlation_id: Uuid,
}
async fn activate(
    State(app): State<App>,
    headers: HeaderMap,
    Json(request): Json<Activation>,
) -> Result<Json<serde_json::Value>, HttpError> {
    authorize_internal(&app, &headers)?;
    let metadata = app
        .registry
        .lock()
        .await
        .load(&request.model_version)
        .map(|model| model.metadata.clone())
        .map_err(|error| {
            tracing::warn!(%error, "model activation rejected");
            http_error(
                StatusCode::UNPROCESSABLE_ENTITY,
                "bundle missing or incompatible",
            )
        })?;
    let checksum = metadata["artifact_checksum"].as_str().unwrap().to_owned();
    let activate_result = async {
        let tx = app.db.begin().await?;
        tx.execute(Statement::from_sql_and_values(DbBackend::Postgres, "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [request.organization_id.to_string().into()])).await?;
        let previous = store::deployment::Entity::find_by_id(request.organization_id).one(&tx).await?;
        if let Some(ref previous) = previous {
            if previous.event_id == request.command_id {
                anyhow::ensure!(previous.model_version == request.model_version, "activation command reused for a different bundle");
                let outbox = store::outbox::Entity::find_by_id(request.command_id).one(&tx).await?.context("activation event missing")?;
                tx.commit().await?;
                return Ok::<_, anyhow::Error>(outbox.payload);
            }
        }
        let now = Utc::now();
        let record = store::deployment::ActiveModel { organization_id: Set(request.organization_id), model_version: Set(request.model_version.clone()), checksum: Set(checksum.clone()), activated_at: Set(now), event_id: Set(request.command_id) };
        if previous.is_some() { record.update(&tx).await?; } else { record.insert(&tx).await?; }
        let event = serde_json::json!({"event_id": request.command_id, "event_type": "model.activated.v1", "schema_version": 1, "organization_id": request.organization_id, "transaction_id": Uuid::nil(), "correlation_id": request.correlation_id, "occurred_at": now, "payload": {"model_version": request.model_version, "checksum": checksum, "metadata": metadata}});
        store::outbox::ActiveModel { id: Set(request.command_id), payload: Set(event.clone()), published: Set(false), created_at: Set(now) }.insert(&tx).await?;
        tx.commit().await?;
        Ok(event)
    }.await;
    activate_result.map(Json).map_err(|error| {
        tracing::error!(%error, "activation persistence failed");
        http_error(
            StatusCode::CONFLICT,
            "activation could not commit; retry with the same command ID",
        )
    })
}
async fn test_inference(
    State(app): State<App>,
    headers: HeaderMap,
    Json(transaction): Json<Transaction>,
) -> Result<Json<domain::Score>, HttpError> {
    authorize_internal(&app, &headers)?;
    score_transaction(&app, transaction)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::warn!(%error, "test inference rejected");
            http_error(
                StatusCode::UNPROCESSABLE_ENTITY,
                "invalid inference request or model execution failure",
            )
        })
}
async fn score_transaction(app: &App, transaction: Transaction) -> anyhow::Result<domain::Score> {
    let deployment = store::deployment::Entity::find_by_id(transaction.organization_id)
        .one(&app.db)
        .await?;
    let mut registry = app.registry.lock().await;
    let version = deployment
        .map(|record| record.model_version)
        .unwrap_or_else(|| registry.default_version.clone());
    registry.load(&version)?.score(transaction)
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Retention {
    before: chrono::DateTime<Utc>,
    transaction_ids: Vec<Uuid>,
}
async fn retention(
    State(app): State<App>,
    headers: HeaderMap,
    UrlPath(organization_id): UrlPath<Uuid>,
    Json(request): Json<Retention>,
) -> Result<Json<serde_json::Value>, HttpError> {
    authorize_internal(&app, &headers)?;
    if request.transaction_ids.is_empty()
        || request.transaction_ids.len() > 200
        || request.before > Utc::now() - chrono::Duration::days(7)
    {
        return Err(http_error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "retention requires 1-200 UUIDs and a cutoff at least seven days old",
        ));
    }
    let result = async {
        let tx = app.db.begin().await?;
        let pending = store::outbox::Entity::find()
            .filter(store::outbox::Column::Published.eq(false))
            .filter(Expr::cust_with_values(
                "payload->>'organization_id' = ?",
                [organization_id.to_string()],
            ))
            .one(&tx)
            .await?;
        anyhow::ensure!(pending.is_none(), "scoring events pending publication");
        let deleted = store::result::Entity::delete_many()
            .filter(store::result::Column::OrganizationId.eq(organization_id))
            .filter(store::result::Column::TransactionId.is_in(request.transaction_ids.clone()))
            .filter(store::result::Column::CreatedAt.lt(request.before))
            .exec(&tx)
            .await?;
        let outboxes = store::outbox::Entity::find()
            .filter(store::outbox::Column::Published.eq(true))
            .filter(store::outbox::Column::CreatedAt.lt(request.before))
            .filter(Expr::cust_with_values(
                "payload->>'organization_id' = ?",
                [organization_id.to_string()],
            ))
            .all(&tx)
            .await?;
        let expired: Vec<Uuid> = outboxes
            .into_iter()
            .filter(|row| {
                row.payload["transaction_id"]
                    .as_str()
                    .and_then(|value| Uuid::parse_str(value).ok())
                    .is_some_and(|id| request.transaction_ids.contains(&id))
            })
            .map(|row| row.id)
            .collect();
        if !expired.is_empty() {
            store::outbox::Entity::delete_many()
                .filter(store::outbox::Column::Id.is_in(expired))
                .exec(&tx)
                .await?;
        }
        tx.commit().await?;
        Ok::<_, anyhow::Error>(deleted.rows_affected)
    }
    .await;
    result
        .map(|deleted| Json(serde_json::json!({"deleted": deleted})))
        .map_err(|error| {
            tracing::warn!(%error, %organization_id, "retention held");
            http_error(
                StatusCode::CONFLICT,
                "retention held while publication or storage is unavailable",
            )
        })
}
async fn metrics() -> String {
    let mut buffer = Vec::new();
    let _ = TextEncoder::new().encode(&prometheus::gather(), &mut buffer);
    String::from_utf8(buffer).unwrap_or_default()
}

async fn process(app: &App, bytes: &[u8]) -> anyhow::Result<()> {
    let value: serde_json::Value = serde_json::from_slice(bytes)?;
    let schema: serde_json::Value = serde_json::from_str(include_str!(
        "../../../contracts/events/transaction.received.v1.json"
    ))?;
    jsonschema::validator_for(&schema)?
        .validate(&value)
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let event: Event<Transaction> = serde_json::from_value(value)?;
    anyhow::ensure!(
        event.organization_id == event.payload.organization_id
            && event.transaction_id == event.payload.id,
        "ownership mismatch"
    );
    if store::result::Entity::find()
        .filter(store::result::Column::OrganizationId.eq(event.organization_id))
        .filter(store::result::Column::TransactionId.eq(event.transaction_id))
        .one(&app.db)
        .await?
        .is_some()
    {
        return Ok(());
    }
    let started = std::time::Instant::now();
    let score = score_transaction(app, event.payload).await?;
    app.latency.observe(started.elapsed().as_secs_f64());
    let output = Event {
        event_id: Uuid::new_v4(),
        event_type: "transaction.scored.v1".into(),
        schema_version: 1,
        organization_id: event.organization_id,
        transaction_id: event.transaction_id,
        correlation_id: event.correlation_id,
        occurred_at: Utc::now(),
        payload: score.clone(),
        trace_parent: event.trace_parent.clone(),
    };
    let tx = app.db.begin().await?;
    let result = store::result::ActiveModel {
        id: Set(Uuid::new_v4()),
        organization_id: Set(event.organization_id),
        transaction_id: Set(event.transaction_id),
        event_id: Set(event.event_id),
        model_version: Set(score.model_version.clone()),
        score: Set(serde_json::to_value(score)?),
        created_at: Set(Utc::now()),
    };
    // Unique constraint plus transaction protects against concurrent duplicate delivery.
    result.insert(&tx).await?;
    store::outbox::ActiveModel {
        id: Set(output.event_id),
        payload: Set(serde_json::to_value(output)?),
        published: Set(false),
        created_at: Set(Utc::now()),
    }
    .insert(&tx)
    .await?;
    tx.commit().await?;
    app.count.inc();
    tracing::info!(transaction_id=%event.transaction_id, organization_id=%event.organization_id, correlation_id=%event.correlation_id, "scored transaction");
    Ok(())
}

async fn consume(app: App, brokers: String) -> anyhow::Result<()> {
    let consumer: StreamConsumer<LagContext> = ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("group.id", "sentinel-inference-v1")
        .set("enable.auto.commit", "false")
        .set("enable.auto.offset.store", "false")
        .set("auto.offset.reset", "earliest")
        .set("statistics.interval.ms", "5000")
        .create_with_context(LagContext {
            lag: app.lag.clone(),
        })?;
    consumer.subscribe(&["transaction.received.v1"])?;
    loop {
        let message = consumer.recv().await?;
        let payload = message.payload().unwrap_or(b"null");
        let mut succeeded = false;
        for attempt in 0..5 {
            match process(&app, payload).await {
                Ok(()) => {
                    succeeded = true;
                    break;
                }
                Err(error) => {
                    app.failures.inc();
                    tracing::error!(%error, attempt, "scoring failure");
                    tokio::time::sleep(Duration::from_millis(200 * (1 << attempt))).await;
                }
            }
        }
        if !succeeded {
            // Never commit a poison event until its exact bytes are durably in the DLQ.
            loop {
                match app
                    .producer
                    .send(
                        FutureRecord::to("transaction.received.v1.dlq")
                            .key(message.key().unwrap_or(b"unknown"))
                            .payload(payload),
                        Duration::from_secs(5),
                    )
                    .await
                {
                    Ok(_) => break,
                    Err((error, _)) => {
                        tracing::error!(%error, "DLQ unavailable; partition processing held");
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                }
            }
        }
        consumer.commit_message(&message, CommitMode::Sync)?;
    }
}

async fn publish(app: App) -> anyhow::Result<()> {
    loop {
        let pending = store::outbox::Entity::find()
            .filter(store::outbox::Column::Published.eq(false))
            .order_by_asc(store::outbox::Column::CreatedAt)
            .limit(50)
            .all(&app.db)
            .await;
        match pending {
            Ok(rows) => {
                for row in rows {
                    let payload = row.payload.to_string();
                    let key = row.payload["organization_id"].as_str().unwrap_or("unknown");
                    let topic = row.payload["event_type"]
                        .as_str()
                        .unwrap_or("transaction.scored.v1");
                    let mut headers = OwnedHeaders::new();
                    if let Some(value) = row.payload["trace_parent"].as_str() {
                        headers = headers.insert(Header {
                            key: "traceparent",
                            value: Some(value),
                        });
                    }
                    if let Some(value) = row.payload["correlation_id"].as_str() {
                        headers = headers.insert(Header {
                            key: "correlation-id",
                            value: Some(value),
                        });
                    }
                    if app
                        .producer
                        .send(
                            FutureRecord::to(topic)
                                .key(key)
                                .payload(&payload)
                                .headers(headers),
                            Duration::from_secs(5),
                        )
                        .await
                        .is_ok()
                    {
                        let mut active: store::outbox::ActiveModel = row.into();
                        active.published = Set(true);
                        if let Err(error) = active.update(&app.db).await {
                            tracing::error!(%error, "outbox acknowledgement failed; will replay");
                        }
                    }
                }
            }
            Err(error) => tracing::error!(%error, "outbox read failed"),
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
#[cfg(test)]
mod persistence_tests {
    use super::*;
    use sea_orm::PaginatorTrait;

    #[tokio::test]
    #[ignore = "requires dedicated TEST_DATABASE_URL; run integration profile"]
    async fn atomic_scoring_duplicate_delivery_and_tenant_isolation() {
        let db = Database::connect(
            env::var("TEST_DATABASE_URL").expect("dedicated test database required"),
        )
        .await
        .unwrap();
        db.execute_unprepared(include_str!("../migrations/001_init.sql"))
            .await
            .unwrap();
        db.execute_unprepared(include_str!("../migrations/002_model_activation.sql"))
            .await
            .unwrap();
        let registry = registry::Registry::new(
            &Path::new(env!("CARGO_MANIFEST_DIR")).join("../../ml/artifacts/v1"),
        )
        .unwrap();
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", "localhost:9092")
            .create()
            .unwrap();
        let app = App {
            db: db.clone(),
            registry: Arc::new(Mutex::new(registry)),
            producer,
            count: IntCounter::new("test_scored", "test").unwrap(),
            failures: IntCounter::new("test_failed", "test").unwrap(),
            latency: Histogram::with_opts(HistogramOpts::new("test_duration", "test")).unwrap(),
            internal_secret: "test-service-token-of-at-least-32-characters".into(),
            lag: IntGaugeVec::new(Opts::new("test_lag", "test"), &["partition"]).unwrap(),
        };
        let mut event: serde_json::Value = serde_json::from_str(include_str!(
            "../../../contracts/fixtures/transaction.received.v1.json"
        ))
        .unwrap();
        let org = Uuid::new_v4();
        let txn = Uuid::new_v4();
        event["organization_id"] = org.to_string().into();
        event["payload"]["organization_id"] = org.to_string().into();
        event["transaction_id"] = txn.to_string().into();
        event["payload"]["id"] = txn.to_string().into();
        event["event_id"] = Uuid::new_v4().to_string().into();
        let bytes = serde_json::to_vec(&event).unwrap();
        let (one, two) = tokio::join!(process(&app, &bytes), process(&app, &bytes));
        assert!(one.is_ok() || two.is_ok());
        process(&app, &bytes).await.unwrap();
        assert_eq!(
            store::result::Entity::find()
                .filter(store::result::Column::OrganizationId.eq(org))
                .count(&db)
                .await
                .unwrap(),
            1
        );
        let outboxes = store::outbox::Entity::find().all(&db).await.unwrap();
        assert_eq!(
            outboxes
                .iter()
                .filter(|row| row.payload["organization_id"] == org.to_string())
                .count(),
            1
        );
        let other = Uuid::new_v4();
        event["organization_id"] = other.to_string().into();
        // An envelope/payload ownership mismatch must never persist.
        assert!(process(&app, &serde_json::to_vec(&event).unwrap())
            .await
            .is_err());
        event["payload"]["organization_id"] = other.to_string().into();
        event["event_id"] = Uuid::new_v4().to_string().into();
        process(&app, &serde_json::to_vec(&event).unwrap())
            .await
            .unwrap();
        assert_eq!(
            store::result::Entity::find()
                .filter(store::result::Column::OrganizationId.eq(other))
                .count(&db)
                .await
                .unwrap(),
            1
        );
        for tenant in [org, other] {
            for row in store::outbox::Entity::find().all(&db).await.unwrap() {
                if row.payload["organization_id"] == tenant.to_string() {
                    store::outbox::Entity::delete_by_id(row.id)
                        .exec(&db)
                        .await
                        .unwrap();
                }
            }
            store::result::Entity::delete_many()
                .filter(store::result::Column::OrganizationId.eq(tenant))
                .exec(&db)
                .await
                .unwrap();
        }
    }
}
