import Link from "next/link";
import { Wordmark } from "@/components/ui/identity";
import { ArrowUpRight } from "lucide-react";
export default function APIReference() {
  return (
    <main className="reference-page">
      <header className="reference-header">
        <Wordmark />
        <Link href="/" className="underlined-link">
          Return to the desk <ArrowUpRight size={15} />
        </Link>
      </header>
      <span className="eyebrow">DEVELOPER REFERENCE</span>
      <h1>SentinelML API</h1>
      <p className="muted">Version 0.1.0 · OpenAPI 3.1 · UTC timestamps</p>
      <section className="panel detail-content">
        <h2>Transaction ingestion</h2>
        <p>
          Send tokenized synthetic transactions to{" "}
          <code>POST /ingest/v1/transactions</code> with an organization Bearer
          key and a unique <code>Idempotency-Key</code>. A 202 response means
          the transaction is durably queued; scoring is asynchronous.
        </p>
        <h3>Analyst control plane</h3>
        <p>
          Obtain a CSRF token from <code>GET /api/auth/session</code>, then sign
          in at <code>POST /api/auth/login</code>. Session cookies authenticate
          reads. Mutations also require <code>X-CSRF-Token</code>.
        </p>
        <p>
          Available resources include transactions, alerts, cases, policies,
          models, feedback, audit, and dashboard. Case and policy updates
          require the current lock_version.
        </p>
        <a className="button button-primary" href="/openapi.yaml" download>
          Download OpenAPI specification
        </a>
        <h3>Error handling</h3>
        <p>
          Errors return an <code>error</code> message. Refresh stale records
          after 409, correct validation failures after 422, and respect
          Retry-After when ingestion returns 429.
        </p>
        <p className="muted">
          The specification is the maintained endpoint reference. No external
          payment actions are supported.
        </p>
      </section>
      <p style={{ marginTop: 20 }}>
        <Link className="text-link" href="/">
          Return to workspace →
        </Link>
      </p>
    </main>
  );
}
