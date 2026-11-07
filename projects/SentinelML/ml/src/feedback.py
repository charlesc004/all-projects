"""Convert an analyst-reviewed feedback export into a chronologically sortable mapped CSV.

Usage: python -m ml.src.feedback --input reviewed-feedback.json --output ml/datasets/reviewed.csv
This creates an offline input only; it never retrains or activates a model.
"""

import argparse
import json
import math
from pathlib import Path
import pandas as pd
from .features import FEATURES


def convert(source, output):
    rows = json.loads(Path(source).read_text(encoding="utf-8"))["items"]
    latest = {}
    for row in sorted(rows, key=lambda item: item["created_at"]):
        if row["outcome"] in {
            "confirmed_fraud",
            "false_positive",
            "legitimate_transaction",
        }:
            latest[row["transaction_id"]] = row
    mapped = []
    for row in latest.values():
        features = row["features"]
        if (
            row["feature_version"] != "features-v1"
            or len(features) != len(FEATURES)
            or not all(math.isfinite(x) for x in features)
        ):
            raise ValueError("unsupported or non-finite feedback features")
        record = dict(zip(FEATURES, features))
        record["amount"] = math.expm1(record.pop("log_amount"))
        record["fraud"] = int(row["outcome"] == "confirmed_fraud")
        record["occurred_at"] = row["transaction_created_at"]
        mapped.append(record)
    if not mapped:
        raise ValueError("no conclusive, reviewed feedback records")
    frame = pd.DataFrame(mapped).sort_values("occurred_at")
    target = Path(output)
    if target.exists():
        raise ValueError("output already exists; use a new dataset version")
    target.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(target, index=False)
    return len(frame)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    print(f"Exported {convert(args.input, args.output)} reviewed records")
