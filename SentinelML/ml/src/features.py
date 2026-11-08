"""Ordered features-v1 contract shared with Rust. Amounts remain in currency units.
Synthetic data uses USD exclusively; real deployments need currency normalization.
"""

import numpy as np

FEATURES = [
    "log_amount",
    "account_age_days",
    "velocity_hour",
    "device_trust",
    "distance_km",
    "failed_attempts",
    "new_device",
    "country_mismatch",
    "hour_utc",
]


def transform(frame, allow_missing=False):
    result = frame.copy()
    if (result["amount"] <= 0).any():
        raise ValueError("amount must be positive")
    result["log_amount"] = np.log1p(result["amount"])
    values = result[FEATURES].to_numpy(dtype=np.float32)
    if np.isinf(values).any() or (not allow_missing and np.isnan(values).any()):
        raise ValueError("non-finite feature")
    return values
