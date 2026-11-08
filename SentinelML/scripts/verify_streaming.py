"""Exercise broker recovery, duplicate delivery and exact-byte DLQ handling locally.

Only the current Compose project's Redpanda service is temporarily stopped.
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import uuid
from verify_pipeline import Client, wait_for

ROOT = Path(__file__).resolve().parents[1]
DOCKER = (
    ["docker"]
    if shutil.which("docker")
    else [
        "wsl.exe",
        "-d",
        "Ubuntu-24.04",
        "-u",
        "root",
        "--cd",
        str(ROOT),
        "--",
        "docker",
    ]
)


def docker(*args, data=None, timeout=60):
    result = subprocess.run(
        DOCKER + ["compose", *args],
        input=data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=ROOT,
        timeout=timeout,
        check=True,
    )
    return result.stdout


def verify():
    client = Client()
    client.login(
        "admin@sentinelml.example", os.getenv("DEMO_PASSWORD", "LocalDemo!2026")
    )
    docker("stop", "redpanda")
    try:
        accepted = client.request(
            "/api/demo/transactions", "POST", {"scenario": "suspicious"}, 202
        )
        txn = accepted["transaction_id"]
        assert not client.request(f"/api/transactions?q={txn}")["items"]
    finally:
        docker("start", "redpanda")
    wait_for(
        lambda: client.request(f"/api/transactions?q={txn}")["items"],
        "accepted transaction did not recover after broker restart",
    )
    raw = docker(
        "exec",
        "-T",
        "redpanda",
        "rpk",
        "topic",
        "consume",
        "transaction.received.v1",
        "-o",
        "start",
        "-n",
        "1",
        "-f",
        "%v",
    )
    event = json.loads(raw)
    event_txn = event["transaction_id"]
    before = client.request(f"/api/cases?transaction_id={event_txn}")["total"]
    for _ in range(2):
        docker(
            "exec",
            "-T",
            "redpanda",
            "rpk",
            "topic",
            "produce",
            "transaction.received.v1",
            "-k",
            event["organization_id"],
            data=raw + b"\n",
        )
    assert client.request(f"/api/transactions?q={event_txn}")["total"] == 1
    assert client.request(f"/api/cases?transaction_id={event_txn}")["total"] == before
    for topic in ["transaction.received.v1", "transaction.scored.v1"]:
        # A unique payload allows repeat verification even when older poison events remain in the DLQ.
        marker = str(uuid.uuid4())
        poison = json.dumps(
            {"verification": "intentional-poison", "marker": marker}
        ).encode()
        metadata = json.loads(
            docker(
                "exec",
                "-T",
                "redpanda",
                "rpk",
                "topic",
                "describe",
                topic + ".dlq",
                "-p",
                "--format",
                "json",
            )
        )
        offset = metadata[0]["partitions"][0]["high_watermark"]
        docker(
            "exec",
            "-T",
            "redpanda",
            "rpk",
            "topic",
            "produce",
            topic,
            "-k",
            "verification-poison",
            data=poison + b"\n",
        )
        received = docker(
            "exec",
            "-T",
            "redpanda",
            "rpk",
            "topic",
            "consume",
            topic + ".dlq",
            "-p",
            "0",
            "-o",
            str(offset),
            "-n",
            "1",
            "-f",
            "%v",
            timeout=45,
        )
        assert received == poison, "dead-letter payload changed"
    print(
        json.dumps(
            {
                "status": "passed",
                "recovered_transaction_id": txn,
                "checks": [
                    "durable acceptance during broker outage",
                    "scoring after recovery",
                    "duplicate event replay",
                    "Rust bounded retries and exact-byte DLQ",
                    "Rails bounded retries and exact-byte DLQ",
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    verify()
