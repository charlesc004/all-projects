"""Submit synthetic requests to Go; never bypasses inference or policy evaluation."""

import argparse
import json
import os
import random
import time
import uuid
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8080/ingest")
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument("--interval", type=float, default=0.2)
    args = parser.parse_args()
    key = os.environ.get("INGESTION_API_KEY", "synthetic-demo-key-change-me")
    rng = random.Random(42)
    for index in range(args.count):
        suspicious = rng.random() < 0.15
        payload = {
            "account_token": f"tok_synthetic_{index:06d}",
            "merchant": rng.choice(
                [
                    "Northstar Market",
                    "Horizon Electronics",
                    "Atlas Travel",
                    "Cedar Outfitters",
                ]
            ),
            "amount": round(
                rng.uniform(2500, 9000) if suspicious else rng.uniform(10, 300), 2
            ),
            "currency": "USD",
            "country": "US",
            "account_age_days": 4 if suspicious else 800,
            "velocity_hour": 12 if suspicious else 1,
            "device_trust": 0.01 if suspicious else 0.95,
            "distance_km": 1800 if suspicious else 5,
            "failed_attempts": 5 if suspicious else 0,
            "new_device": suspicious,
            "country_mismatch": suspicious,
        }
        request = urllib.request.Request(
            args.url + "/v1/transactions",
            json.dumps(payload).encode(),
            {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
                "Idempotency-Key": str(uuid.uuid4()),
            },
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            print(response.status, response.read().decode())
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
