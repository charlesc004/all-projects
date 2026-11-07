# Contributing to SentinelML

## Local setup

Follow the [quick start](README.md#quick-start), use a local `.env` and seed the synthetic workspace. Configure the toolchain versions used by the Dockerfiles and CI when developing a service natively.

## Changes and reviews

1. Create a focused branch from `main`.
2. Keep database ownership and tenant authorization inside the owning service.
3. Preserve event compatibility, ordered model features and idempotent delivery behavior.
4. Use migrations for schema changes and new version directories for model bundles.
5. Run the checks relevant to the change and include the exact results in the pull request.
6. Explain the user-visible behavior, the implementation boundary and any operational migration required.

Use concise English commit messages such as `feat: add a tenant-scoped review policy` or `fix: preserve idempotency during outbox replay`. Keep unrelated refactors separate.

## Required checks

- Frontend: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` from `frontend/`.
- Browser workflows: the live stack and seed must be available; run the relevant Playwright tests.
- Python/contracts: `python -m pytest ml/tests contracts -q`; match the formatting checks in CI.
- Go/Rust/Rails: run the relevant unit checks and isolated persistence tests documented in [verification](docs/verification.md).

Use dedicated databases for destructive test fixtures. Operational replay defaults to validation only; do not publish replay batches or run retention against an unrelated deployment.

## Data and artifacts

Use synthetic or tokenized records. Do not commit real customer data, `.env` files, raw credentials, backups, installed dependencies or local caches. New model versions must include the measured evaluation outputs, feature contract, ONNX bundle and checksum; do not overwrite an existing version.

## Interface and documentation

Keep the VECTOR design system consistent across desktop and mobile, retain keyboard access and provide meaningful empty/error states. Product text, documentation, examples and commit messages should be in English. Update API and architecture documentation when a contract or operational requirement changes.

Review the security reporting instructions in [SECURITY.md](SECURITY.md) before sharing a suspected vulnerability.
