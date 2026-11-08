"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, FlaskConical, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, timestamp } from "@/lib/api";
import type { Audit, Dashboard, Model, Page, Policy, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DriftPanel } from "./drift";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Badge,
  Drawer,
  Empty,
  ErrorState,
  Pagination,
  Skeleton,
} from "@/components/ui/shared";

export function ModelsScreen({ user }: { user: User }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const canManage = ["admin", "risk_manager"].includes(user.role);
  const query = useQuery({
    queryKey: ["models"],
    queryFn: () => api<{ items: Model[] }>("/models"),
  });
  if (query.isPending) return <Skeleton />;
  if (query.error) return <ErrorState error={query.error} />;
  return (
    <div className="model-list">
      {canManage && (
        <div className="model-actions">
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/models/refresh", { method: "POST", body: "{}" });
                await client.invalidateQueries({ queryKey: ["models"] });
                toast.success("Validated model registry refreshed");
              } catch (error) {
                toast.error((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Discover validated model bundles
          </Button>
          <p className="muted">
            Activation changes inference for this organization. Prior validated
            bundles remain available for rollback.
          </p>
        </div>
      )}
      {query.data.items.length > 1 && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Model comparison</h2>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Training data</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>PR-AUC</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((model) => (
                  <tr key={model.id}>
                    <td>
                      {model.version}
                      {model.active ? " - active" : ""}
                    </td>
                    <td>
                      {model.metadata.dataset_version || "Recorded in manifest"}
                    </td>
                    <td>
                      {(model.metadata.metrics.precision * 100).toFixed(2)}%
                    </td>
                    <td>{(model.metadata.metrics.recall * 100).toFixed(2)}%</td>
                    <td>{(model.metadata.metrics.pr_auc * 100).toFixed(2)}%</td>
                    <td>{model.metadata.decision_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {query.data.items.length ? (
        query.data.items.map((model) => (
          <section className="panel" key={model.id}>
            <div className="panel-heading">
              <div className="model-title">
                <span className="metric-icon violet">
                  <FlaskConical />
                </span>
                <div>
                  <h2>
                    {model.metadata.model_type}{" "}
                    <span className="version">{model.version}</span>
                  </h2>
                  <p>Trained {timestamp(model.metadata.trained_at)}</p>
                </div>
              </div>
              <div className="model-actions">
                <Badge value={model.active ? "active" : "inactive"} />
                {canManage && !model.active && (
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Activate ${model.version} for this organization? In-flight assessments retain their original model version.`,
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await api(
                          `/models/${encodeURIComponent(model.version)}/activate`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              command_id: crypto.randomUUID(),
                            }),
                          },
                        );
                        await client.invalidateQueries();
                        toast.success(`Model ${model.version} activated`);
                      } catch (error) {
                        toast.error((error as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Activate {model.version}
                  </Button>
                )}
              </div>
            </div>
            <div className="model-metrics">
              {Object.entries({
                Precision: model.metadata.metrics.precision,
                Recall: model.metadata.metrics.recall,
                "F1 score": model.metadata.metrics.f1,
                "ROC-AUC": model.metadata.metrics.roc_auc,
                "PR-AUC": model.metadata.metrics.pr_auc,
              }).map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{(value * 100).toFixed(2)}%</strong>
                </div>
              ))}
            </div>
            <div className="model-detail-grid">
              <div>
                <h3>Confusion matrix · holdout test set</h3>
                <table className="matrix">
                  <thead>
                    <tr>
                      <th />
                      <th>Predicted legitimate</th>
                      <th>Predicted fraud</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>Actual legitimate</th>
                      {model.metadata.metrics.confusion_matrix[0].map(
                        (n, i) => (
                          <td key={i}>{n}</td>
                        ),
                      )}
                    </tr>
                    <tr>
                      <th>Actual fraud</th>
                      {model.metadata.metrics.confusion_matrix[1].map(
                        (n, i) => (
                          <td key={i}>{n}</td>
                        ),
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3>Deployment manifest</h3>
                <dl className="manifest">
                  <dt>Decision threshold</dt>
                  <dd>{model.metadata.decision_threshold}</dd>
                  <dt>Feature contract</dt>
                  <dd>
                    features-v1 · {model.metadata.feature_names.length} features
                  </dd>
                  <dt>Checksum (SHA-256)</dt>
                  <dd className="mono break-all">
                    {model.metadata.artifact_checksum}
                  </dd>
                </dl>
              </div>
            </div>
            {model.metadata.metrics.precision_recall_curve && (
              <div className="performance-chart">
                <h3>Precision–recall · holdout test set</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={model.metadata.metrics.precision_recall_curve.recall.map(
                      (recall, i) => ({
                        recall,
                        precision:
                          model.metadata.metrics.precision_recall_curve!
                            .precision[i],
                      }),
                    )}
                  >
                    <XAxis dataKey="recall" type="number" domain={[0, 1]} />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Line dataKey="precision" stroke="#0aa99f" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="feature-values">
              <h3>Training feature importance</h3>
              {model.metadata.feature_importance ? (
                Object.entries(model.metadata.feature_importance)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, value]) => (
                    <div key={name}>
                      <span>{name.replaceAll("_", " ")}</span>
                      <strong>{(value * 100).toFixed(2)}%</strong>
                    </div>
                  ))
              ) : (
                <p className="muted">
                  Not recorded in this historical bundle. Bundle v3 includes
                  measured forest feature importance.
                </p>
              )}
            </div>
            <div className="panel-note">
              <ShieldCheck size={17} /> Metrics describe synthetic evaluation
              data. Activation validates immutable bundles and changes this
              organization’s model without restarting inference.
            </div>
          </section>
        ))
      ) : (
        <section className="panel">
          <Empty text="Train a model and run the registry seed to see evaluation results." />
        </section>
      )}
      <DriftPanel />
    </div>
  );
}
const policySchema = z.object({
  name: z.string().min(3).max(120),
  severity: z.enum(["low", "medium", "high", "critical"]),
  risk_score_min: z.number().min(0).max(100),
  amount_min: z.number().min(0).max(10000000),
  velocity_hour_min: z.number().min(0).max(100000),
  new_device: z.enum(["any", "yes", "no"]),
  country_mismatch: z.enum(["any", "yes", "no"]),
  priority: z.number().int().min(0).max(10000),
  open_case: z.boolean(),
});
function PolicyForm({
  record,
  onSaved,
}: {
  record: Policy | null;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof policySchema>>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      name: record?.name || "",
      severity: (record?.severity as "high") || "high",
      risk_score_min: Number(record?.conditions.risk_score_min ?? 70),
      amount_min: Number(record?.conditions.amount_min || 0),
      velocity_hour_min: Number(record?.conditions.velocity_hour_min || 0),
      new_device:
        record?.conditions.new_device === undefined
          ? "any"
          : record.conditions.new_device
            ? "yes"
            : "no",
      country_mismatch:
        record?.conditions.country_mismatch === undefined
          ? "any"
          : record.conditions.country_mismatch
            ? "yes"
            : "no",
      priority: record?.priority ?? 100,
      open_case: record?.open_case ?? true,
    },
  });
  return (
    <form
      className="detail-content policy-form"
      onSubmit={handleSubmit(async (values) => {
        try {
          await api(`/policies${record ? `/${record.id}` : ""}`, {
            method: record ? "PATCH" : "POST",
            body: JSON.stringify({
              name: values.name,
              severity: values.severity,
              priority: values.priority,
              open_case: values.open_case,
              conditions: {
                risk_score_min: values.risk_score_min,
                amount_min: values.amount_min,
                velocity_hour_min: values.velocity_hour_min,
                ...(values.new_device !== "any"
                  ? { new_device: values.new_device === "yes" }
                  : {}),
                ...(values.country_mismatch !== "any"
                  ? { country_mismatch: values.country_mismatch === "yes" }
                  : {}),
              },
              ...(record ? { lock_version: record.lock_version } : {}),
            }),
          });
          toast.success("Risk policy saved");
          onSaved();
        } catch (e) {
          toast.error((e as Error).message);
        }
      })}
    >
      <label>
        Policy name
        <input {...register("name")} />
      </label>
      <label>
        Alert severity
        <select {...register("severity")}>
          {["low", "medium", "high", "critical"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <div className="detail-callout">
        <strong>Match all conditions</strong>
        <p>
          Rules determine the review workflow. They do not alter the model’s
          probability.
        </p>
      </div>
      <label>
        Minimum risk score
        <input
          type="number"
          {...register("risk_score_min", { valueAsNumber: true })}
        />
      </label>
      <label>
        Minimum amount
        <input
          type="number"
          step="0.01"
          {...register("amount_min", { valueAsNumber: true })}
        />
      </label>
      <label>
        Minimum transactions in an hour
        <input
          type="number"
          {...register("velocity_hour_min", { valueAsNumber: true })}
        />
      </label>
      <label>
        New device
        <select {...register("new_device")}>
          <option value="any">Any</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      <label>
        Country mismatch
        <select {...register("country_mismatch")}>
          <option value="any">Any</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      <label>
        Priority (lower runs first)
        <input
          type="number"
          {...register("priority", { valueAsNumber: true })}
        />
      </label>
      <label className="checkbox-label">
        <input type="checkbox" {...register("open_case")} />
        Open an investigation case
      </label>
      {Object.entries(errors).map(([key, error]) => (
        <p className="field-error" key={key}>
          {error.message}
        </p>
      ))}
      <Button disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save policy"}
        <Check size={16} />
      </Button>
    </form>
  );
}
export function PoliciesScreen({ user }: { user: User }) {
  const client = useQueryClient();
  const [history, setHistory] = useState<Policy | null>(null);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["policies"],
    queryFn: () => api<Page<Policy>>("/policies?per_page=100"),
  });
  const canEdit = ["admin", "risk_manager"].includes(user.role);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Review policies</h2>
          <p>Configurable business decisions, independent of inference.</p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Create policy
          </Button>
        )}
      </div>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.items.length ? (
        <div className="policy-grid">
          {query.data.items.map((policy) => (
            <article className="policy-card" key={policy.id}>
              <div>
                <Badge value={policy.severity} />
                <span
                  className={`status-text ${policy.enabled ? "enabled" : ""}`}
                >
                  {policy.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <h3>{policy.name}</h3>
              <div className="rule-list">
                {Object.entries(policy.conditions).map(([name, value]) => (
                  <span key={name}>
                    {name.replaceAll("_", " ")} <b>{String(value)}</b>
                  </span>
                ))}
              </div>
              <p className="muted">
                {policy.open_case
                  ? "Create alert and investigation"
                  : "Create alert for review"}
              </p>
              <p className="muted">Priority {policy.priority}</p>
              <Button variant="ghost" onClick={() => setHistory(policy)}>
                Execution history
              </Button>
              {canEdit && (
                <div className="policy-actions">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(policy);
                      setOpen(true);
                    }}
                  >
                    Edit policy
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await api(`/policies/${policy.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            enabled: !policy.enabled,
                            lock_version: policy.lock_version,
                          }),
                        });
                        await client.invalidateQueries({
                          queryKey: ["policies"],
                        });
                        toast.success("Policy updated");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    {policy.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty />
      )}
      <Drawer
        title="Policy execution history"
        open={!!history}
        onClose={() => setHistory(null)}
      >
        {history && <PolicyHistory policy={history} />}
      </Drawer>
      <Drawer
        title={editing ? "Edit risk policy" : "Create risk policy"}
        open={open}
        onClose={() => setOpen(false)}
      >
        {open && (
          <PolicyForm
            key={editing?.id || "new"}
            record={editing}
            onSaved={() => {
              setOpen(false);
              client.invalidateQueries({ queryKey: ["policies"] });
            }}
          />
        )}
      </Drawer>
    </section>
  );
}
export function AuditScreen() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["audit", page],
    queryFn: () => api<Page<Audit>>(`/audit?page=${page}`),
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Organization audit history</h2>
          <p>Accountable actions and recorded workflow changes.</p>
        </div>
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
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Actor</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.action}</strong>
                    </td>
                    <td>
                      {row.resource_type}
                      <small className="mono">{row.resource_id}</small>
                    </td>
                    <td className="mono">
                      {row.actor_id?.slice(0, 8) || "System"}
                    </td>
                    <td>{timestamp(row.created_at)}</td>
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
    </section>
  );
}
export { SettingsScreen } from "./settings";
export function MonitoringScreen() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
    refetchInterval: 3000,
  });
  if (query.isPending) return <Skeleton />;
  if (query.error) return <ErrorState error={query.error} />;
  return (
    <>
      <section className="pipeline-banner">
        <span className="metric-icon blue">
          <ActivityIcon />
        </span>
        <div>
          <h2>Observe the complete transaction journey.</h2>
          <p>
            Go ingestion → Kafka → Rust ONNX inference → Rails policy evaluation
          </p>
        </div>
      </section>
      <div className="kpi-grid">
        {[
          { label: "Scored transactions", value: query.data.transactions },
          { label: "Policy alerts", value: query.data.alerts },
          { label: "Open investigations", value: query.data.open_cases },
          { label: "High-risk assessments", value: query.data.high_risk },
        ].map((row) => (
          <article key={row.label} className="kpi">
            <span className="kpi-label">{row.label}</span>
            <strong>{row.value.toLocaleString()}</strong>
            <p>Persisted control-plane records</p>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Operational telemetry</h2>
            <p>Inspect per-service health and processing metrics.</p>
          </div>
        </div>
        <div className="monitor-links">
          <a href="http://localhost:9090" target="_blank" rel="noreferrer">
            <strong>Prometheus</strong>
            <p>Service metrics and ingestion / inference counters</p>
          </a>
          <a href="http://localhost:3002" target="_blank" rel="noreferrer">
            <strong>Grafana</strong>
            <p>Pipeline throughput and model execution latency</p>
          </a>
        </div>
        <div className="panel-note">
          The browser does not infer service health from record counts. Use the
          readiness probes and operational telemetry for availability checks.
        </div>
      </section>
      <DriftPanel />
    </>
  );
}
function ActivityIcon() {
  return <FlaskConical size={24} />;
}

function PolicyHistory({ policy }: { policy: Policy }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["policy-executions", policy.id, page],
    queryFn: () =>
      api<
        Page<{
          id: string;
          transaction_id: string;
          matched: boolean;
          created_at: string;
          conditions: object;
        }>
      >(`/policy-executions?policy_id=${policy.id}&page=${page}`),
  });
  if (query.isPending) return <Skeleton />;
  if (query.error) return <ErrorState error={query.error} />;
  return (
    <div className="detail-content">
      <h3>{policy.name}</h3>
      {query.data.items.length ? (
        <>
          {query.data.items.map((row) => (
            <article className="detail-callout" key={row.id}>
              <strong>{row.matched ? "Matched" : "Did not match"}</strong>
              <p className="mono">{row.transaction_id}</p>
              <small>{timestamp(row.created_at)}</small>
              <pre>{JSON.stringify(row.conditions, null, 2)}</pre>
            </article>
          ))}
          <Pagination page={page} total={query.data.total} onPage={setPage} />
        </>
      ) : (
        <Empty text="This policy has not evaluated a transaction yet." />
      )}
    </div>
  );
}
