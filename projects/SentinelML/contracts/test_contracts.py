import json
from pathlib import Path
import pytest
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT = Path(__file__).parent


def test_all_schemas_valid():
    for path in (ROOT / "events").glob("*.json"):
        Draft202012Validator.check_schema(json.loads(path.read_text()))


def test_shared_ingestion_fixture():
    schema = json.loads((ROOT / "events/transaction.received.v1.json").read_text())
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    fixture = json.loads((ROOT / "fixtures/transaction.received.v1.json").read_text())
    validator.validate(fixture)
    fixture["payload"]["cvv"] = "123"
    with pytest.raises(ValidationError):
        validator.validate(fixture)


def test_real_scoring_fixture():
    schema = json.loads((ROOT / "events/transaction.scored.v1.json").read_text())
    fixture = json.loads((ROOT / "fixtures/transaction.scored.v1.json").read_text())
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(fixture)
    assert fixture["payload"]["transaction"]["id"] == fixture["transaction_id"]
