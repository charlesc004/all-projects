"""Generate committed JSON Schema contracts from shared definitions."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UUID = {"type": "string", "format": "uuid"}
NUMBER = {"type": "number", "minimum": 0}
TRANSACTION = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "id": UUID,
        "organization_id": UUID,
        "account_token": {
            "type": "string",
            "pattern": "^tok_[A-Za-z0-9_-]{1,124}$",
            "minLength": 5,
            "maxLength": 128,
        },
        "merchant": {"type": "string", "minLength": 2, "maxLength": 128},
        "amount": {"type": "number", "exclusiveMinimum": 0, "maximum": 10000000},
        "currency": {"type": "string", "pattern": "^[A-Z]{3}$"},
        "country": {"type": "string", "pattern": "^[A-Z]{2}$"},
        "account_age_days": NUMBER,
        "velocity_hour": NUMBER,
        "device_trust": {"type": "number", "minimum": 0, "maximum": 1},
        "distance_km": NUMBER,
        "failed_attempts": NUMBER,
        "new_device": {"type": "boolean"},
        "country_mismatch": {"type": "boolean"},
        "created_at": {"type": "string", "format": "date-time"},
    },
}
TRANSACTION["required"] = list(TRANSACTION["properties"])


def event(name, payload):
    properties = {
        "event_id": UUID,
        "event_type": {"const": name},
        "schema_version": {"const": 1},
        "organization_id": UUID,
        "transaction_id": UUID,
        "correlation_id": UUID,
        "occurred_at": {"type": "string", "format": "date-time"},
        "payload": payload,
    }
    required = list(properties)
    properties["trace_parent"] = {
        "type": "string",
        "pattern": "^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$",
    }
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"https://schemas.sentinelml.example/events/{name}",
        "type": "object",
        "additionalProperties": False,
        "properties": properties,
        "required": required,
    }


def main():
    scored = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "transaction": TRANSACTION,
            "model_version": {"type": "string", "minLength": 1},
            "feature_version": {"const": "features-v1"},
            "fraud_probability": {"type": "number", "minimum": 0, "maximum": 1},
            "risk_score": {"type": "integer", "minimum": 0, "maximum": 100},
            "risk_level": {"enum": ["low", "medium", "high", "critical"]},
            "decision_threshold": {"type": "number", "minimum": 0, "maximum": 1},
            "inference_latency_ms": NUMBER,
            "risk_indicators": {"type": "array", "items": {"type": "string"}},
            "features": {
                "type": "array",
                "items": {"type": "number"},
                "minItems": 9,
                "maxItems": 9,
            },
        },
    }
    scored["required"] = list(scored["properties"])
    payloads = {
        "transaction.received.v1": TRANSACTION,
        "transaction.scored.v1": scored,
        "fraud.alert.created.v1": {
            "type": "object",
            "properties": {
                "alert_id": UUID,
                "severity": {"enum": ["low", "medium", "high", "critical"]},
            },
            "required": ["alert_id", "severity"],
            "additionalProperties": False,
        },
        "fraud.case.updated.v1": {
            "type": "object",
            "properties": {
                "case_id": UUID,
                "status": {"type": "string"},
                "lock_version": {"type": "integer"},
            },
            "required": ["case_id", "status", "lock_version"],
            "additionalProperties": False,
        },
        "model.activated.v1": {
            "type": "object",
            "properties": {
                "model_version": {"type": "string"},
                "checksum": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
                "metadata": {
                    "type": "object",
                    "required": [
                        "model_version",
                        "artifact_checksum",
                        "feature_names",
                        "decision_threshold",
                        "metrics",
                    ],
                },
            },
            "required": ["model_version", "checksum", "metadata"],
            "additionalProperties": False,
        },
    }
    for name, payload in payloads.items():
        (ROOT / "contracts/events" / f"{name}.json").write_text(
            json.dumps(event(name, payload), indent=2) + "\n"
        )
    transaction = {
        "id": "22222222-2222-4222-8222-222222222222",
        "organization_id": "11111111-1111-4111-8111-111111111111",
        "account_token": "tok_synthetic_001",
        "merchant": "Northstar Market",
        "amount": 240.0,
        "currency": "USD",
        "country": "US",
        "account_age_days": 100,
        "velocity_hour": 2,
        "device_trust": 0.9,
        "distance_km": 10,
        "failed_attempts": 0,
        "new_device": False,
        "country_mismatch": False,
        "created_at": "2026-01-01T00:00:00Z",
    }
    envelope = {
        "event_id": "33333333-3333-4333-8333-333333333333",
        "event_type": "transaction.received.v1",
        "schema_version": 1,
        "organization_id": transaction["organization_id"],
        "transaction_id": transaction["id"],
        "correlation_id": "44444444-4444-4444-8444-444444444444",
        "occurred_at": transaction["created_at"],
        "payload": transaction,
    }
    (ROOT / "contracts/fixtures/transaction.received.v1.json").write_text(
        json.dumps(envelope, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
