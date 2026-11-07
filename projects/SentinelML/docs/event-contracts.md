# Versioned events

JSON Schema 2020-12 files in `contracts/events` describe:

| Topic | Producer | Consumer |
|---|---|---|
| transaction.received.v1 | Go transactional outbox | Rust |
| transaction.scored.v1 | Rust scoring outbox | Rails Karafka |
| fraud.alert.created.v1 | Rails control outbox | Downstream extension point |
| fraud.case.updated.v1 | Rails control outbox | Downstream extension point |
| model.activated.v1 | Contract reserved for future coordinated activation | Not implemented |

Every envelope contains event_id, schema_version, event_type, organization_id, transaction_id, correlation_id, occurred_at, and a typed payload. Timestamps are UTC. Scoring payloads include the model version, feature contract, probability, threshold, measured inference duration, indicators, and feature vector.

Financial event payloads are strict objects. Unknown properties, including card numbers and CVV, are rejected. A token reference is required instead. Currency and country fields require uppercase codes. The current model does not include exchange-rate normalization; the supplied synthetic demo is USD-only.

The Go event is built from a server-owned DTO. Rust checks the committed schema and embedded tenant identifiers; Rails validates the scoring schema and ownership. Python schema tests validate fixtures, Rust consumes the shared input fixture, and RSpec consumes an ONNX-generated scoring fixture. The fixture is for tests, never dashboard seeding.

Go's publisher retries indefinitely with capped exponential backoff and retains accepted data. Rust and Rails retry processing five times, then synchronously publish original bytes to their respective `.dlq` topic before acknowledging. Operators must inspect and replay DLQ records after correcting root causes. Broker outages leave outbox records pending.

Correlation IDs propagate in event envelopes. W3C trace headers and full distributed OpenTelemetry spans are not implemented. Ordering follows broker partitions but applications must not rely on exactly-once delivery. Kafka acknowledgement and database commits cannot form an atomic cross-system transaction in this implementation.

Schemas deliberately reject unknown fields. Adding fields therefore requires a compatible consumer rollout or a new schema version. Run `python scripts/create_contracts.py` only when deliberately updating the source definitions; inspect the generated changes.
