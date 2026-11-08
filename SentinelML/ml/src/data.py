"""Reproducible latent-mixture generator; labels precede behavioral observations."""

import numpy as np
import pandas as pd


def generate(size=18000, seed=42):
    rng = np.random.default_rng(seed)
    fraud = rng.random(size) < 0.065
    # Overlapping class distributions deliberately avoid perfect separability.
    frame = pd.DataFrame(
        {
            "amount": np.exp(rng.normal(4.4 + fraud * 1.05, 1.25, size)).clip(
                1, 100000
            ),
            "account_age_days": rng.exponential(650 - fraud * 430, size).clip(0, 8000),
            "velocity_hour": rng.poisson(1.8 + fraud * 4, size),
            "device_trust": rng.beta(6 - fraud * 3, 2 + fraud * 2, size),
            "distance_km": rng.exponential(30 + fraud * 480, size).clip(0, 40000),
            "failed_attempts": rng.poisson(0.25 + fraud * 1.6, size),
            "new_device": rng.random(size) < (0.10 + fraud * 0.51),
            "country_mismatch": rng.random(size) < (0.06 + fraud * 0.46),
            "hour_utc": rng.integers(0, 24, size),
            "fraud": fraud.astype(int),
            "occurred_at": pd.date_range(
                "2026-01-01", periods=size, freq="min", tz="UTC"
            ),
        }
    )
    return frame


def import_csv(path):
    """Accept a caller-licensed, mapped CSV. Never downloads third-party data."""
    frame = pd.read_csv(path)
    required = set(generate(1).columns)
    if not required.issubset(frame.columns):
        raise ValueError(f"required columns: {sorted(required)}")
    if not set(frame.fraud.unique()).issubset({0, 1}):
        raise ValueError("fraud must be binary")
    frame["occurred_at"] = pd.to_datetime(frame.occurred_at, utc=True)
    return frame.sort_values("occurred_at")
