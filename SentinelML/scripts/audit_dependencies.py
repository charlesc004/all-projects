"""Audit resolved Rust, Ruby and Go package versions against OSV's public API.

This checks dependency versions, not exploitability or container OS packages.
"""

import json
import re
import tomllib
from pathlib import Path
import urllib.request


def audit():
    root = Path(__file__).resolve().parents[1]
    packages = []
    cargo = tomllib.loads((root / "services/inference/Cargo.lock").read_text())
    selected = root / ".tools/active-rust-dependencies.txt"
    active = (
        set(
            re.findall(
                r"^([\w-]+) v([\w.+-]+)", selected.read_text(encoding="utf-8-sig"), re.M
            )
        )
        if selected.exists()
        else None
    )
    packages += [
        ("crates.io", row["name"], row["version"])
        for row in cargo["package"]
        if "source" in row
        and (active is None or (row["name"], row["version"]) in active)
    ]
    gem = (root / "services/control-plane/Gemfile.lock").read_text()
    packages += [
        ("RubyGems", name, version)
        for name, version in re.findall(r"^    ([\w-]+) \(([\d.]+)\)$", gem, re.M)
    ]
    module = (root / "services/ingestion/go.mod").read_text()
    packages += [
        ("Go", name, version)
        for name, version in re.findall(r"^\s*([\w./-]+) (v[\w.+-]+)", module, re.M)
    ]
    queries = [
        {"package": {"ecosystem": ecosystem, "name": name}, "version": version}
        for ecosystem, name, version in packages
    ]
    request = urllib.request.Request(
        "https://api.osv.dev/v1/querybatch",
        data=json.dumps({"queries": queries}).encode(),
        headers={"Content-Type": "application/json"},
    )
    result = json.load(urllib.request.urlopen(request, timeout=90))
    findings = [
        {
            "ecosystem": ecosystem,
            "package": name,
            "version": version,
            "advisories": [item["id"] for item in row.get("vulns", [])],
        }
        for (ecosystem, name, version), row in zip(packages, result["results"])
        if row.get("vulns")
    ]
    report = {
        "rust_scope": "selected production graph"
        if active is not None
        else "entire lockfile",
        "packages_checked": len(packages),
        "findings": findings,
    }
    (root / ".tools/dependency-audit.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return bool(findings)


if __name__ == "__main__":
    raise SystemExit(audit())
