import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import onnx
import onnxruntime as ort
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from skl2onnx import to_onnx
from .data import generate, import_csv
from .features import FEATURES, transform
from .evaluation import choose_threshold, evaluate


def train(
    output, size=18000, seed=42, csv=None, false_negative_cost=20, false_positive_cost=1
):
    output = Path(output)
    if (output / "model.onnx").exists() or (output / "metadata.json").exists():
        raise ValueError("model versions are immutable; choose a new output version")
    if false_negative_cost <= 0 or false_positive_cost <= 0:
        raise ValueError("threshold costs must be positive")
    frame = import_csv(csv) if csv else generate(size, seed)
    values = transform(frame, allow_missing=True)
    labels = frame.fraud.to_numpy()
    a, b = int(len(frame) * 0.6), int(len(frame) * 0.8)
    model = Pipeline(
        [
            ("impute", SimpleImputer(keep_empty_features=True)),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    min_samples_leaf=5,
                    class_weight="balanced_subsample",
                    random_state=seed,
                    n_jobs=1,
                ),
            ),
        ]
    )
    model.fit(values[:a], labels[:a])
    baseline = model.named_steps["impute"].transform(values[:a])
    threshold, comparisons = choose_threshold(
        labels[a:b],
        model.predict_proba(values[a:b])[:, 1],
        false_negative_cost,
        false_positive_cost,
    )
    probabilities = model.predict_proba(values[b:])[:, 1]
    metrics = evaluate(labels[b:], probabilities, threshold)
    exported = to_onnx(
        model, values[:1], target_opset=17, options={id(model[-1]): {"zipmap": False}}
    )
    onnx.checker.check_model(exported)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    artifact = exported.SerializeToString()
    (output / "model.onnx").write_bytes(artifact)
    session = ort.InferenceSession(artifact, providers=["CPUExecutionProvider"])
    actual = session.run(None, {session.get_inputs()[0].name: values[b : b + 100]})[1][
        :, 1
    ]
    np.testing.assert_allclose(actual, probabilities[:100], atol=1e-5)
    checksum = hashlib.sha256(artifact).hexdigest()
    metadata = {
        "model_version": output.name,
        "feature_version": "features-v1",
        "model_type": "RandomForestClassifier",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_names": FEATURES,
        "decision_threshold": threshold,
        "dataset_version": f"csv-sha256-{hashlib.sha256(Path(csv).read_bytes()).hexdigest()}"
        if csv
        else f"synthetic-v1-seed-{seed}",
        "threshold_costs": {
            "false_negative": false_negative_cost,
            "false_positive": false_positive_cost,
        },
        "artifact_checksum": checksum,
        "feature_importance": dict(
            zip(FEATURES, model.named_steps["classifier"].feature_importances_.tolist())
        ),
        "metrics": metrics,
        "split": {"train": a, "validation": b - a, "test": len(frame) - b},
        "seed": seed,
        "baseline_histograms": {
            name: {
                "counts": np.histogram(baseline[:, i], bins=10)[0].tolist(),
                "edges": np.histogram(baseline[:, i], bins=10)[1].tolist(),
            }
            for i, name in enumerate(FEATURES)
        },
    }
    for name, data in [
        ("metadata", metadata),
        ("metrics", metrics),
        (
            "feature_schema",
            {"version": "features-v1", "names": FEATURES, "dtype": "float32"},
        ),
        ("threshold_comparison", comparisons),
    ]:
        (output / f"{name}.json").write_text(
            json.dumps(data, indent=2), encoding="utf-8"
        )
    (output / "checksum.sha256").write_text(checksum + "  model.onnx\n")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="ml/artifacts/v1")
    parser.add_argument("--size", type=int, default=18000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--csv")
    parser.add_argument("--false-negative-cost", type=float, default=20)
    parser.add_argument("--false-positive-cost", type=float, default=1)
    args = parser.parse_args()
    print(
        json.dumps(
            train(
                args.output,
                args.size,
                args.seed,
                args.csv,
                args.false_negative_cost,
                args.false_positive_cost,
            )["metrics"],
            indent=2,
        )
    )
