# Security policy

SentinelML is a synthetic-data engineering demonstration. It does not process external payments or represent a production security certification.

## Reporting a vulnerability

Do not publish passwords, keys, private records, exploit credentials or database dumps in an issue. Use the repository's private security reporting channel if available, or ask the maintainer for a private contact method without disclosing exploit details publicly.

Include the affected component and revision, a minimal synthetic-data reproduction, the expected impact and any suggested mitigation. Do not test against systems you do not own or have permission to assess.

## Deployment defaults

The demo account and example ingestion key are intentionally documented local defaults. Before exposing a deployment remotely:

- Set `DEMO_ENABLED=false`, replace example credentials and independently rotate service secrets.
- Enable secure cookies, terminate TLS and restrict allowed hosts.
- Provision separate service database roles and authenticated dependency connections.
- Keep `.env`, backups, raw API credentials and operational logs outside version control.
- Review dependency findings against the selected runtime graph and maintain supported versions.

The demo-login endpoint retains CSRF protection, rate limiting, configured-password verification, account-status checks and revocable sessions. A disabled demo environment returns no demo-login route functionality.

See [the security model](docs/security.md) and [deployment guidance](docs/deployment.md) for the complete assumptions and limits.
