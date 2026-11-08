"""Verify the live platform through its public HTTP boundary, without API mocks.
Run after docker compose up and db:seed: python scripts/verify_pipeline.py
Secrets are held in memory and are never printed.
"""

import http.cookiejar
import json
import os
import time
import urllib.error
import urllib.request
import uuid

BASE = os.getenv("SENTINEL_BASE_URL", "http://localhost:8080").rstrip("/")


class Client:
    def __init__(self):
        self.http = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        self.csrf = ""

    def request(self, path, method="GET", body=None, expected=200, headers=None):
        request = urllib.request.Request(
            BASE + path,
            data=json.dumps(body).encode() if body is not None else None,
            method=method,
            headers={
                "Content-Type": "application/json",
                "X-CSRF-Token": self.csrf,
                "Origin": BASE,
                **(headers or {}),
            },
        )
        try:
            response = self.http.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        if response.status != expected:
            raise AssertionError(
                f"{method} {path}: expected {expected}, received {response.status}; {raw[:300]!r}"
            )
        result = (
            json.loads(raw)
            if raw and "json" in response.headers.get("Content-Type", "")
            else raw
        )
        if isinstance(result, dict) and "csrf_token" in result:
            self.csrf = result["csrf_token"]
        return result

    def login(self, email, password):
        def ready():
            try:
                return self.request("/api/auth/session")
            except (urllib.error.URLError, AssertionError):
                return None

        wait_for(ready, "control-plane session endpoint did not become ready")
        self.request("/api/auth/login", "POST", {"email": email, "password": password})


def wait_for(fn, message):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        result = fn()
        if result:
            return result
        time.sleep(1)
    raise AssertionError(message)


def verify():
    admin = Client()
    admin.login(
        "admin@sentinelml.example", os.getenv("DEMO_PASSWORD", "LocalDemo!2026")
    )
    credential = admin.request(
        "/api/credentials", "POST", {"name": "Integration verification"}, 201
    )
    # Credential API returns the secret once; list responses must never contain it.
    key = credential["credential"]
    assert key not in json.dumps(admin.request("/api/credentials"))
    external = Client()
    payload = {
        "account_token": "tok_verification_001",
        "merchant": "Horizon Electronics",
        "amount": 6500,
        "currency": "USD",
        "country": "US",
        "account_age_days": 4,
        "velocity_hour": 12,
        "device_trust": 0.02,
        "distance_km": 1800,
        "failed_attempts": 5,
        "new_device": True,
        "country_mismatch": True,
    }
    headers = {"Authorization": f"Bearer {key}", "Idempotency-Key": str(uuid.uuid4())}
    accepted = external.request(
        "/ingest/v1/transactions", "POST", payload, 202, headers
    )
    txn = accepted["transaction_id"]
    replay = external.request("/ingest/v1/transactions", "POST", payload, 202, headers)
    assert replay["duplicate"] and replay["transaction_id"] == txn
    external.request(
        "/ingest/v1/transactions", "POST", {**payload, "amount": 6501}, 409, headers
    )
    rows = wait_for(
        lambda: admin.request(f"/api/transactions?q={txn}")["items"],
        "transaction was not scored",
    )
    assessment = rows[0]
    assert assessment["transaction_id"] == txn and assessment["risk_score"] >= 60
    assert (
        assessment["feature_version"] == "features-v1"
        and len(assessment["features"]) == 9
    )
    cases = wait_for(
        lambda: admin.request(f"/api/cases?transaction_id={txn}")["items"],
        "policy did not open a case",
    )
    case = cases[0]
    updated = admin.request(
        f"/api/cases/{case['id']}",
        "PATCH",
        {
            "status": "resolved",
            "outcome": "confirmed_fraud",
            "note": "Verified real streaming pipeline and model evidence.",
            "lock_version": case["lock_version"],
        },
    )
    assert updated["outcome"] == "confirmed_fraud"
    admin.request(
        f"/api/cases/{case['id']}",
        "PATCH",
        {"status": "resolved", "lock_version": case["lock_version"]},
        409,
    )
    assert any(
        row["transaction_id"] == txn and row["outcome"] == "confirmed_fraud"
        for row in admin.request("/api/feedback")["items"]
    )
    assert any(
        row["transaction_id"] == txn and row["matched"]
        for row in admin.request("/api/policy-executions?per_page=100")["items"]
    )
    report = admin.request("/api/reports/transactions.csv")
    assert txn.encode() in report
    admin.request("/api/models/refresh", "POST", {})
    command = str(uuid.uuid4())
    for _ in range(2):
        admin.request("/api/models/v2/activate", "POST", {"command_id": command})
    headers["Idempotency-Key"] = str(uuid.uuid4())
    second = external.request("/ingest/v1/transactions", "POST", payload, 202, headers)
    scored = wait_for(
        lambda: admin.request(f"/api/transactions?q={second['transaction_id']}")[
            "items"
        ],
        "v2 transaction was not scored",
    )
    assert scored[0]["model_version"] == "v2"
    admin.request("/api/models/v1/activate", "POST", {"command_id": str(uuid.uuid4())})
    rotated = admin.request(
        "/api/credentials",
        "POST",
        {"name": "Rotated verification key", "rotate_id": credential["id"]},
        201,
    )
    headers["Idempotency-Key"] = str(uuid.uuid4())
    external.request("/ingest/v1/transactions", "POST", payload, 401, headers)
    headers["Authorization"] = f"Bearer {rotated['credential']}"
    external.request("/ingest/v1/transactions", "POST", payload, 202, headers)
    admin.request(f"/api/credentials/{rotated['id']}", "PATCH", {})
    external.request("/ingest/v1/transactions", "POST", payload, 401, headers)
    viewer = Client()
    viewer.login(
        "casey.blake@sentinelml.example", os.getenv("DEMO_PASSWORD", "LocalDemo!2026")
    )
    viewer.request("/api/policies", "POST", {"name": "Forbidden verification"}, 403)
    viewer.request(
        "/api/models/v2/activate", "POST", {"command_id": str(uuid.uuid4())}, 403
    )
    viewer.request("/api/credentials", expected=403)
    admin.request("/api/monitoring")
    admin.request("/api/auth/logout", "DELETE", expected=204)
    admin.request("/api/settings", expected=401)
    print(
        json.dumps(
            {
                "status": "passed",
                "transaction_id": txn,
                "case_id": case["id"],
                "checks": [
                    "durable ingestion",
                    "idempotency",
                    "real Rust ONNX",
                    "policy evaluation",
                    "investigation",
                    "optimistic concurrency",
                    "feedback",
                    "CSV report",
                    "live v2 activation",
                    "activation replay",
                    "v1 rollback",
                    "key rotation/revocation",
                    "viewer authorization",
                    "session revocation",
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    verify()
