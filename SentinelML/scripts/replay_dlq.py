"""Validate and optionally replay a bounded JSONL DLQ export without changing event IDs.

Export: docker compose exec -T redpanda rpk topic consume transaction.received.v1.dlq -n 10 -f '%v\n' > dlq.jsonl
Inspect and repair the cause before replaying. Default is validation only.
"""

import argparse
import json
import subprocess
from pathlib import Path
import jsonschema


def replay(source, topic, limit=10, publish=False):
    root = Path(__file__).resolve().parents[1]
    if (
        topic
        not in {
            "transaction.received.v1",
            "transaction.scored.v1",
            "model.activated.v1",
        }
        or not 1 <= limit <= 100
    ):
        raise ValueError("select a supported source topic and a limit of 1-100")
    schema = json.loads((root / "contracts/events" / f"{topic}.json").read_text())
    values = []
    with Path(source).open(encoding="utf-8-sig") as stream:
        for line in stream:
            if not line.strip():
                continue
            if len(values) == limit:
                raise ValueError(
                    "export exceeds replay limit; create a smaller reviewed batch"
                )
            event = json.loads(line)
            jsonschema.Draft202012Validator(
                schema, format_checker=jsonschema.FormatChecker()
            ).validate(event)
            values.append(event)
    if publish:
        for event in values:
            subprocess.run(
                [
                    "docker",
                    "compose",
                    "exec",
                    "-T",
                    "redpanda",
                    "rpk",
                    "topic",
                    "produce",
                    topic,
                    "-k",
                    event["organization_id"],
                ],
                input=json.dumps(event, separators=(",", ":")) + "\n",
                text=True,
                cwd=root,
                check=True,
            )
    return len(values)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--topic", required=True)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    print(
        f"{'Published' if args.publish else 'Validated'} {replay(args.input, args.topic, args.limit, args.publish)} events"
    )
