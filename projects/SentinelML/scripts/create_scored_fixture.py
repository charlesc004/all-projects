"""Contract fixture from the committed ONNX artifact, not a fabricated assessment."""

import json
from pathlib import Path
import numpy as np
import onnxruntime as ort

root = Path(__file__).resolve().parents[1]
event = json.loads(
    (root / "contracts/fixtures/transaction.received.v1.json").read_text()
)
transaction = event["payload"]
transaction.update(
    amount=6500,
    account_age_days=4,
    velocity_hour=12,
    device_trust=0.02,
    distance_km=1800,
    failed_attempts=5,
    new_device=True,
    country_mismatch=True,
)
features = [float(np.log1p(transaction["amount"])), 4, 12, 0.02, 1800, 5, 1, 1, 0]
session = ort.InferenceSession(str(root / "ml/artifacts/v1/model.onnx"))
probability = float(
    session.run(
        None, {session.get_inputs()[0].name: np.array([features], dtype=np.float32)}
    )[1][0, 1]
)
metadata = json.loads((root / "ml/artifacts/v1/metadata.json").read_text())
score = round(probability * 100)
event["event_type"] = "transaction.scored.v1"
event["payload"] = {
    "transaction": transaction,
    "model_version": "v1",
    "feature_version": "features-v1",
    "fraud_probability": probability,
    "risk_score": score,
    "risk_level": "critical"
    if score >= 90
    else "high"
    if score >= 70
    else "medium"
    if score >= 40
    else "low",
    "decision_threshold": metadata["decision_threshold"],
    "inference_latency_ms": 0,
    "risk_indicators": [
        "LARGE_TRANSACTION_AMOUNT",
        "NEW_DEVICE",
        "HIGH_TRANSACTION_VELOCITY",
        "COUNTRY_MISMATCH",
        "LOW_DEVICE_TRUST",
    ],
    "features": features,
}
(root / "contracts/fixtures/transaction.scored.v1.json").write_text(
    json.dumps(event, indent=2) + "\n"
)
