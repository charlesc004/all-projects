import hashlib
import json
import numpy as np
import pytest
from ml.src.data import generate
from ml.src.features import transform, FEATURES
from ml.src.train import train
from ml.src.monitoring import population_stability_index


def test_reproducible_dataset_and_feature_order():
    a, b = generate(1000), generate(1000)
    assert a.equals(b)
    assert 0.02 < a.fraud.mean() < 0.12
    x = transform(a)
    assert x.shape == (1000, len(FEATURES))
    np.testing.assert_allclose(x[:, 0], np.log1p(a.amount), rtol=1e-6)
    assert a.occurred_at.is_monotonic_increasing


def test_reject_nonfinite():
    frame = generate(10)
    frame.loc[0, "amount"] = float("inf")
    with pytest.raises(ValueError):
        transform(frame)


def test_real_training_export_parity_and_metadata(tmp_path):
    metadata = train(tmp_path / "test-v1", size=3000)
    assert metadata["metrics"]["pr_auc"] > 0.55
    assert metadata["split"] == {"train": 1800, "validation": 600, "test": 600}
    assert (
        hashlib.sha256((tmp_path / "test-v1/model.onnx").read_bytes()).hexdigest()
        == metadata["artifact_checksum"]
    )
    assert (
        json.loads((tmp_path / "test-v1/feature_schema.json").read_text())["names"]
        == FEATURES
    )


def test_drift():
    rng = np.random.default_rng(42)
    reference = rng.normal(size=1000)
    assert population_stability_index(reference, reference) == 0
    assert population_stability_index(reference, reference + 4) > 1


def test_training_missing_values_and_immutable_versions(tmp_path):
    frame = generate(3000)
    frame.loc[0, "device_trust"] = np.nan
    frame["distance_km"] = np.nan
    source = tmp_path / "mapped.csv"
    frame.to_csv(source, index=False)
    metadata = train(tmp_path / "reviewed-v1", csv=source, false_negative_cost=30)
    assert metadata["threshold_costs"]["false_negative"] == 30
    assert len(metadata["feature_importance"]) == len(FEATURES)
    assert sum(metadata["feature_importance"].values()) == pytest.approx(1)
    assert metadata["dataset_version"].startswith("csv-sha256-")
    with pytest.raises(ValueError, match="immutable"):
        train(tmp_path / "reviewed-v1")


def test_feedback_deduplicates_latest_conclusive_labels(tmp_path):
    from ml.src.feedback import convert
    import pandas as pd

    source = tmp_path / "feedback.json"
    base = {
        "transaction_id": "txn-1",
        "transaction_created_at": "2026-01-01T00:00:00Z",
        "feature_version": "features-v1",
        "features": transform(generate(1))[0].tolist(),
    }
    source.write_text(
        json.dumps(
            {
                "items": [
                    {
                        **base,
                        "created_at": "2026-01-02T00:00:00Z",
                        "outcome": "confirmed_fraud",
                    },
                    {
                        **base,
                        "created_at": "2026-01-03T00:00:00Z",
                        "outcome": "false_positive",
                    },
                ]
            }
        )
    )
    target = tmp_path / "curated.csv"
    assert convert(source, target) == 1
    assert pd.read_csv(target).fraud.tolist() == [0]
