"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownUp,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { api, money, timestamp } from "@/lib/api";
import type { Assessment, Alert, Case, Page, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Drawer,
  Empty,
  ErrorState,
  Pagination,
  Skeleton,
} from "@/components/ui/shared";
const statuses = [
  "new",
  "acknowledged",
  "investigating",
  "escalated",
  "resolved",
  "dismissed",
];

export function AssessmentDetail({ record }: { record: Assessment }) {
  return (
    <div className="detail-content">
      <div className="risk-hero">
        <div>
          <span className="eyebrow">MODEL RISK SCORE</span>
          <strong>
            {record.risk_score}
            <small>/100</small>
          </strong>
        </div>
        <Badge value={record.risk_level} />
      </div>
      <div className="risk-meter">
        <span style={{ width: `${record.risk_score}%` }} />
      </div>
      <dl className="detail-grid">
        <div>
          <dt>Transaction</dt>
          <dd className="mono">{record.transaction_id}</dd>
        </div>
        <div>
          <dt>Merchant</dt>
          <dd>{record.transaction.merchant}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>
            {money(record.transaction.amount, record.transaction.currency)}
          </dd>
        </div>
        <div>
          <dt>Country</dt>
          <dd>{record.transaction.country}</dd>
        </div>
        <div>
          <dt>Fraud probability</dt>
          <dd>{(record.fraud_probability * 100).toFixed(3)}%</dd>
        </div>
        <div>
          <dt>Model threshold</dt>
          <dd>{record.decision_threshold}</dd>
        </div>
        <div>
          <dt>Model version</dt>
          <dd>{record.model_version}</dd>
        </div>
        <div>
          <dt>Inference duration</dt>
          <dd>{record.inference_latency_ms.toFixed(2)} ms</dd>
        </div>
        <div>
          <dt>Received</dt>
          <dd>{timestamp(record.transaction.created_at)}</dd>
        </div>
        <div>
          <dt>Scored</dt>
          <dd>{timestamp(record.created_at)}</dd>
        </div>
      </dl>
      <h3>Feature-based risk indicators</h3>
      <p className="muted">
        These are observed behavioral signals, separate from model probability
        and policy decisions.
      </p>
      <div className="indicator-list">
        {record.risk_indicators.length ? (
          record.risk_indicators.map((value) => (
            <Badge key={value} value={value.toLowerCase()} />
          ))
        ) : (
          <p className="muted">No heuristic risk indicators.</p>
        )}
      </div>
      <h3>Feature snapshot · {record.feature_version}</h3>
      <div className="feature-values">
        {[
          "Log amount",
          "Account age (days)",
          "Hourly velocity",
          "Device trust",
          "Distance (km)",
          "Failed attempts",
          "New device",
          "Country mismatch",
          "Hour (UTC)",
        ].map((label, i) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{record.features[i]?.toFixed(3)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransactionsScreen() {
  const [q, setQ] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("q") || ""
      : "",
  );
  const [risk, setRisk] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Assessment | null>(null);
  const query = useQuery({
    queryKey: ["transactions", q, risk, page, sort, from, to],
    queryFn: () =>
      api<Page<Assessment>>(
        `/transactions?${new URLSearchParams({ q, risk_level: risk, page: String(page), sort, ...(from ? { from: `${from}T00:00:00Z` } : {}), ...(to ? { to: `${to}T23:59:59Z` } : {}) })}`,
      ),
    refetchInterval: 5000,
  });
  return (
    <section className="panel">
      <div className="table-toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search transactions"
            placeholder="Search merchant or transaction ID…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="toolbar-filters">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Risk filter"
            value={risk}
            onChange={(e) => {
              setRisk(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All risk levels</option>
            {["low", "medium", "high", "critical"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <input
            type="date"
            aria-label="From date UTC"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <input
            type="date"
            aria-label="To date UTC"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
          <a
            className="button"
            href={`/api/reports/transactions.csv?${new URLSearchParams({ ...(from ? { from: `${from}T00:00:00Z` } : {}), ...(to ? { to: `${to}T23:59:59Z` } : {}) })}`}
          >
            Export CSV
          </a>
          <Button
            variant="outline"
            onClick={() => {
              setSort(sort === "risk_score" ? "created_at" : "risk_score");
              setPage(1);
            }}
          >
            <ArrowDownUp size={15} />
            {sort === "risk_score" ? "Risk score" : "Most recent"}
          </Button>
        </div>
      </div>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : query.data.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Timestamp</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Country</th>
                  <th>Risk score</th>
                  <th>Model</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="row-link mono"
                        onClick={() => setSelected(row)}
                      >
                        {row.transaction_id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="nowrap">
                      {timestamp(row.transaction.created_at)}
                    </td>
                    <td>
                      <strong>{row.transaction.merchant}</strong>
                    </td>
                    <td className="nowrap">
                      {money(row.transaction.amount, row.transaction.currency)}
                    </td>
                    <td>{row.transaction.country}</td>
                    <td>
                      <span className="score-inline">
                        <b>{row.risk_score}</b>
                        <Badge value={row.risk_level} />
                      </span>
                    </td>
                    <td>{row.model_version}</td>
                    <td>
                      <Button
                        variant="ghost"
                        aria-label={`Inspect ${row.transaction_id}`}
                        onClick={() => setSelected(row)}
                      >
                        <ArrowUpRight size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={query.data.total} onPage={setPage} />
        </>
      ) : (
        <Empty />
      )}
      <Drawer
        title="Transaction intelligence"
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && <AssessmentDetail record={selected} />}
      </Drawer>
    </section>
  );
}

export function AlertsScreen({ user }: { user: User }) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Alert | null>(null);
  const [q, setQ] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("acknowledged");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["alerts", page, status, q],
    queryFn: () =>
      api<Page<Alert>>(
        `/alerts?${new URLSearchParams({ page: String(page), status, q })}`,
      ),
    refetchInterval: 5000,
  });
  async function update(row: Alert, status: string) {
    try {
      await api(`/alerts/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, lock_version: row.lock_version }),
      });
      toast.success("Alert updated");
      await client.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <section className="panel">
      <div className="table-toolbar">
        <div>
          <h2>Alert queue</h2>
          <p className="muted">Policy decisions, ready for analyst review.</p>
        </div>
        <input
          aria-label="Search alerts"
          placeholder="Search transaction, merchant or policy"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
            setChecked([]);
            setChecked([]);
          }}
        />
        {user.role !== "viewer" && checked.length > 0 && (
          <div className="model-actions">
            <select
              aria-label="Bulk alert status"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              {statuses.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <Button
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    `Update ${checked.length} selected alerts to ${bulkStatus}?`,
                  )
                )
                  return;
                setBusy(true);
                try {
                  await api("/alerts/bulk", {
                    method: "PATCH",
                    body: JSON.stringify({
                      status: bulkStatus,
                      items: query.data?.items
                        .filter((row) => checked.includes(row.id))
                        .map((row) => ({
                          id: row.id,
                          lock_version: row.lock_version,
                        })),
                    }),
                  });
                  setChecked([]);
                  await client.invalidateQueries({ queryKey: ["alerts"] });
                  toast.success("Selected alerts updated");
                } catch (error) {
                  toast.error((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Update {checked.length} alerts
            </Button>
          </div>
        )}
        <select
          aria-label="Alert status filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            setChecked([]);
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {user.role !== "viewer" && <th>Select</th>}
                  <th>Severity</th>
                  <th>Merchant / policy</th>
                  <th>Risk</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Investigation</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((row) => (
                  <tr key={row.id}>
                    {user.role !== "viewer" && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select alert ${row.id}`}
                          checked={checked.includes(row.id)}
                          onChange={(e) =>
                            setChecked(
                              e.target.checked
                                ? [...checked, row.id]
                                : checked.filter((id) => id !== row.id),
                            )
                          }
                        />
                      </td>
                    )}
                    <td>
                      <Badge value={row.severity} />
                    </td>
                    <td>
                      <button
                        className="row-link"
                        onClick={() => setSelected(row)}
                      >
                        {row.assessment.transaction.merchant}
                      </button>
                      <small>{row.policy}</small>
                    </td>
                    <td>
                      <b>{row.assessment.risk_score}</b>
                    </td>
                    <td className="nowrap">{timestamp(row.created_at)}</td>
                    <td>
                      {user.role === "viewer" ? (
                        <Badge value={row.status} />
                      ) : (
                        <select
                          aria-label={`Status for alert ${row.id}`}
                          value={row.status}
                          onChange={(e) => update(row, e.target.value)}
                        >
                          {statuses.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {row.case_id ? (
                        <a
                          className="text-link"
                          href={`/cases?id=${row.case_id}`}
                        >
                          Open case <ArrowUpRight size={14} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={query.data.total} onPage={setPage} />
        </>
      ) : (
        <Empty text="No alerts match this queue." />
      )}
      <Drawer
        title="Alert evidence"
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <div className="detail-callout">
              <strong>Matched business policy</strong>
              <p>{selected.policy}</p>
              <Badge value={selected.severity} />
            </div>
            <AssessmentDetail record={selected.assessment} />
          </>
        )}
      </Drawer>
    </section>
  );
}

function CaseEditor({
  record,
  user,
  onChange,
}: {
  record: Case;
  user: User;
  onChange: () => void;
}) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(record.status);
  const [outcome, setOutcome] = useState(record.outcome || "");
  const [assignee, setAssignee] = useState(record.assigned_user_id || "");
  const [saving, setSaving] = useState(false);
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ users: User[] }>("/settings"),
  });
  return (
    <>
      <div className="detail-content">
        <div className="case-summary">
          <div>
            <span className="eyebrow">INVESTIGATION</span>
            <h2>{record.id.slice(0, 8)}</h2>
          </div>
          <Badge value={record.status} />
        </div>
        <p className="muted">Matched policy: {record.alert.policy}</p>
        <form
          className="case-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              outcome &&
              outcome !== record.outcome &&
              !window.confirm(
                "Record this reviewed outcome and resolve the investigation?",
              )
            )
              return;
            setSaving(true);
            try {
              await api(`/cases/${record.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  status,
                  lock_version: record.lock_version,
                  assigned_user_id: assignee || null,
                  ...(note ? { note } : {}),
                  ...(outcome ? { outcome } : {}),
                }),
              });
              toast.success("Investigation saved");
              setNote("");
              onChange();
            } catch (error) {
              toast.error((error as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="form-grid">
            <label>
              Status
              <select
                disabled={user.role === "viewer"}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statuses.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Assigned analyst
              <select
                disabled={user.role === "viewer"}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {settings.data?.users
                  .filter((u) => u.role !== "viewer")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label>
            Investigation outcome
            <select
              disabled={user.role === "viewer"}
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                if (e.target.value) setStatus("resolved");
              }}
            >
              <option value="">No outcome recorded</option>
              {[
                "confirmed_fraud",
                "false_positive",
                "legitimate_transaction",
                "inconclusive",
              ].map((v) => (
                <option key={v} value={v}>
                  {v.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Analyst note
            <textarea
              disabled={user.role === "viewer"}
              maxLength={4000}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Document evidence, observations, and next steps…"
            />
          </label>
          {user.role !== "viewer" && (
            <Button disabled={saving}>
              {saving ? "Saving…" : "Save investigation"}
            </Button>
          )}
        </form>
        <h3>Activity & notes</h3>
        <div className="timeline">
          <div>
            <i />
            <p>
              <strong>Case opened</strong>
              <small>{timestamp(record.created_at)}</small>
            </p>
          </div>
          {record.notes.map((item) => (
            <div key={item.id}>
              <i />
              <p>
                <strong>{item.author}</strong>
                <span>{item.text}</span>
                <small>{timestamp(item.at)}</small>
              </p>
            </div>
          ))}
        </div>
      </div>
      <AssessmentDetail record={record.alert.assessment} />
    </>
  );
}
export function CasesScreen({ user }: { user: User }) {
  const [transactionId, setTransactionId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("id")
      : null,
  );
  const query = useQuery({
    queryKey: ["cases", page, transactionId],
    queryFn: () =>
      api<Page<Case>>(
        `/cases?${new URLSearchParams({ page: String(page), ...(transactionId ? { transaction_id: transactionId } : {}) })}`,
      ),
    refetchInterval: 5000,
  });
  const detail = useQuery({
    queryKey: ["case", selected],
    queryFn: () => api<Case>(`/cases/${selected}`),
    enabled: !!selected,
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Investigation center</h2>
          <p>Human judgment at the heart of every decision.</p>
        </div>
        <input
          aria-label="Filter cases by transaction ID"
          placeholder="Exact transaction ID"
          value={transactionId}
          onChange={(e) => {
            setTransactionId(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Transaction context</th>
                  <th>Priority</th>
                  <th>Assigned analyst</th>
                  <th>Status</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="row-link mono"
                        onClick={() => setSelected(row.id)}
                      >
                        {row.id.slice(0, 8)}
                      </button>
                    </td>
                    <td>
                      <strong>
                        {row.alert.assessment.transaction.merchant}
                      </strong>
                      <small>
                        {money(row.alert.assessment.transaction.amount)} · score{" "}
                        {row.alert.assessment.risk_score}
                      </small>
                    </td>
                    <td>
                      <Badge value={row.alert.severity} />
                    </td>
                    <td>{row.assigned_user || "Unassigned"}</td>
                    <td>
                      <Badge value={row.status} />
                    </td>
                    <td>
                      {row.outcome?.replaceAll("_", " ") || "Pending review"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={query.data.total} onPage={setPage} />
        </>
      ) : (
        <Empty text="Cases open when a matching risk policy requests investigation." />
      )}
      <Drawer
        title="Investigation workspace"
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {detail.isPending ? (
          <Skeleton />
        ) : detail.error ? (
          <ErrorState error={detail.error} />
        ) : (
          detail.data && (
            <CaseEditor
              key={`${detail.data.id}-${detail.data.lock_version}`}
              record={detail.data}
              user={user}
              onChange={() => {
                detail.refetch();
                query.refetch();
              }}
            />
          )
        )}
      </Drawer>
    </section>
  );
}
