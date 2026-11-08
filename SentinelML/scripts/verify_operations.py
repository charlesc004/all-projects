"""Read-only smoke checks for observed drift, live telemetry and provisioned monitoring."""

import json
import os
import urllib.request
from verify_pipeline import Client, wait_for


def verify():
    client = Client()
    client.login(
        "admin@sentinelml.example", os.getenv("DEMO_PASSWORD", "LocalDemo!2026")
    )
    observed = wait_for(
        lambda: (
            data
            if (data := client.request("/api/monitoring"))["status"] == "measured"
            else None
        ),
        "insufficient processed demonstration samples",
    )
    assert all(
        row["samples"] >= 50 and row["psi"] is not None for row in observed["features"]
    )
    assert observed["operational"]["status"] == "measured"
    values = wait_for(
        lambda: (
            data
            if (data := client.request("/api/monitoring"))["operational"]["values"].get(
                "consumer_lag"
            )
            is not None
            else None
        ),
        "consumer lag not observed",
    )
    assert values["operational"]["values"]["model_loaded"] == 1
    assert values["operational"]["values"]["service_scrapes_up"] == 3
    for port, path in [(9090, "/api/v1/targets"), (3002, "/api/health")]:
        with urllib.request.urlopen(
            f"http://localhost:{port}{path}", timeout=10
        ) as response:
            body = json.load(response)
        if port == 9090:
            assert len(body["data"]["activeTargets"]) == 3
            assert all(
                target["health"] == "up" for target in body["data"]["activeTargets"]
            )
        else:
            assert body["database"] == "ok"
    print(
        json.dumps(
            {
                "status": "passed",
                "feature_samples": observed["features"][0]["samples"],
                "model_version": observed["model_version"],
                "telemetry": values["operational"]["values"],
                "checks": [
                    "observed PSI",
                    "native consumer lag",
                    "model loaded",
                    "three healthy scrape targets",
                    "Grafana health",
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    verify()
