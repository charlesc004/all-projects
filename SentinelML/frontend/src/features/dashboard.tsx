"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Activity,
  Bell,
  ScanLine,
  BriefcaseBusiness,
} from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, money, timestamp } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
import { Badge, Empty, ErrorState, Skeleton } from "@/components/ui/shared";
const colors: Record<string, string> = {
  low: "#48b5a3",
  medium: "#d9b45e",
  high: "#d47d66",
  critical: "#c75268",
};
export function DashboardScreen({
  analytics = false,
}: {
  analytics?: boolean;
}) {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
    refetchInterval: 5000,
  });
  if (query.isPending) return <Skeleton />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const data = query.data;
  const distribution = [...data.risk_distribution].sort(
    (a, b) =>
      ["critical", "high", "medium", "low"].indexOf(a.name) -
      ["critical", "high", "medium", "low"].indexOf(b.name),
  );
  const maximum = Math.max(
    1,
    ...(data.top_indicators || []).map((row) => row.count),
  );
  return (
    <div className="risk-brief">
      <div className="brief-dateline">
        <span>
          <i className="record-dot" />
          PERSISTED ASSESSMENTS / REFRESHES EVERY 5 SECONDS
        </span>
        <time dateTime={data.observed_at}>{timestamp(data.observed_at)}</time>
      </div>
      <section className="vector-stats" aria-label="Risk overview">
        {[
          {
            label: "Assessed transactions",
            value: data.transactions,
            icon: ScanLine,
          },
          { label: "Policy alerts", value: data.alerts, icon: Bell },
          { label: "High-risk events", value: data.high_risk, icon: Activity },
          {
            label: "Open investigations",
            value: data.open_cases,
            icon: BriefcaseBusiness,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article className="vector-stat" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value.toLocaleString()}</strong>
            <small>Persisted workspace total</small>
          </article>
        ))}
      </section>
      <div className="brief-analysis-grid">
        <section className="brief-flow">
          <div className="section-heading">
            <div>
              <span className="micro-label">TRANSACTION INTELLIGENCE</span>
              <h2>Clarity in the flow.</h2>
            </div>
            <span className="window-label">14 DAYS / UTC</span>
          </div>
          <div className="pulse-legend">
            <span>
              <i />
              All assessments
            </span>
            <span>
              <i />
              High risk
            </span>
          </div>
          <div className="pulse-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.trend}
                margin={{ top: 10, left: -25, right: 8, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#e2edef"
                  strokeDasharray="2 5"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7c929a", fontSize: 10 }}
                  minTickGap={20}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7c929a", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2edef",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <defs>
                  <linearGradient id="event-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#0aa99f" stopOpacity={0.2} />
                    <stop offset="1" stopColor="#0aa99f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="transactions"
                  name="All assessments"
                  stroke="#0aa99f"
                  fill="url(#event-fill)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="high_risk"
                  name="High risk"
                  stroke="#d47d66"
                  fill="transparent"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-source">
            SOURCE / Scored events persisted by the control plane
          </div>
        </section>
        <section className="brief-model">
          <div className="section-topline">
            <span className="micro-label">CONNECTED INTELLIGENCE</span>
            <span className="model-sigil" aria-hidden="true">
              m
            </span>
          </div>
          {data.model ? (
            <>
              <span className="model-version-label">
                {data.model.version} / {data.model.metadata.model_type}
              </span>
              <h2>
                A clearer picture.
                <br />
                <em>Evidence at every step.</em>
              </h2>
              <div className="model-readout">
                <div>
                  <strong>
                    {(data.model.metadata.metrics.recall * 100).toFixed(1)}
                    <small>%</small>
                  </strong>
                  <span>Model recall</span>
                </div>
                <div>
                  <strong>
                    {(data.model.metadata.metrics.pr_auc * 100).toFixed(1)}
                    <small>%</small>
                  </strong>
                  <span>PR-AUC</span>
                </div>
              </div>
              <p>
                Synthetic holdout evaluation.
                <br />A reference, not a production guarantee.
              </p>
            </>
          ) : (
            <>
              <h2>
                Intelligence
                <br />
                <em>starts here.</em>
              </h2>
              <p>No model metadata has been registered.</p>
            </>
          )}
          <Link href="/models">
            Inspect the model <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
      <section className="brief-watch">
        <div className="section-heading">
          <div>
            <span className="micro-label">PRIORITY SIGNALS</span>
            <h2>Recent policy assessments</h2>
          </div>
          <Link className="underlined-link" href="/alerts">
            All alerts <ArrowUpRight size={15} />
          </Link>
        </div>
        {data.recent_alerts.length ? (
          <div className="docket-list">
            {data.recent_alerts.map((alert, i) => (
              <Link
                href={alert.case_id ? `/cases?id=${alert.case_id}` : "/alerts"}
                className="docket-row"
                key={alert.id}
              >
                <span className="docket-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="docket-context">
                  <strong>{alert.assessment.transaction.merchant}</strong>
                  <small>
                    {alert.policy} <span>/</span>{" "}
                    {alert.assessment.transaction_id.slice(0, 8)}
                  </small>
                </div>
                <span className="docket-amount">
                  {money(
                    alert.assessment.transaction.amount,
                    alert.assessment.transaction.currency,
                  )}
                </span>
                <span className="docket-risk">
                  <b>{alert.assessment.risk_score}</b>
                  <Badge value={alert.severity} />
                </span>
                <Badge value={alert.status} />
                <ArrowUpRight className="docket-arrow" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="No alerts have been created by the policy engine." />
        )}
      </section>
      <div className="brief-evidence-grid">
        <div className="brief-distribution">
          <div className="section-topline">
            <span className="micro-label">RISK COMPOSITION</span>
            <span className="mono">
              {data.transactions.toLocaleString()} EVENTS
            </span>
          </div>
          <h2>Where the signals fall.</h2>
          {data.transactions > 0 ? (
            <>
              <div className="distribution-tape" aria-label="Risk distribution">
                {distribution.map((row) => (
                  <span
                    key={row.name}
                    style={{
                      width: `${(row.value / data.transactions) * 100}%`,
                      background: colors[row.name] || "#48b5a3",
                    }}
                    title={`${row.name}: ${row.value}`}
                  />
                ))}
              </div>
              <div className="distribution-register">
                {distribution.map((row) => (
                  <div key={row.name}>
                    <span>
                      <i style={{ background: colors[row.name] }} />
                      {row.name}
                    </span>
                    <strong>{row.value.toLocaleString()}</strong>
                    <small>
                      {((row.value / data.transactions) * 100).toFixed(1)}%
                    </small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty text="Risk distribution appears after the first transaction is scored." />
          )}
          <div className="distribution-footnote">
            <span className="crosshair">+</span>
            <p>
              Probability is a signal.
              <br />
              <strong>The decision stays with your team.</strong>
            </p>
          </div>
        </div>

        <section className="brief-cases">
          <div className="section-heading">
            <div>
              <span className="micro-label">HUMAN JUDGMENT</span>
              <h2>Investigation log.</h2>
            </div>
            <Link className="underlined-link" href="/cases">
              All cases <ArrowUpRight size={15} />
            </Link>
          </div>
          {data.recent_cases?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Case reference</th>
                    <th>Transaction context</th>
                    <th>Analyst</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_cases.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          className="row-link mono"
                          href={`/cases?id=${row.id}`}
                        >
                          {row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{row.alert.assessment.transaction.merchant}</td>
                      <td>{row.assigned_user || "Unassigned"}</td>
                      <td>
                        <Badge value={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No investigations have been opened." />
          )}
        </section>
        <section className="brief-indicators">
          <div className="section-heading">
            <div>
              <span className="micro-label">OBSERVED BEHAVIOR</span>
              <h2>The recurring signals.</h2>
            </div>
          </div>
          <p className="indicator-source">
            Frequency in the latest 5,000 assessments
          </p>
          {data.top_indicators?.length ? (
            data.top_indicators.map((row) => (
              <div className="signal-frequency" key={row.name}>
                <div>
                  <span>{row.name.toLowerCase().replaceAll("_", " ")}</span>
                  <strong>{row.count}</strong>
                </div>
                <div className="frequency-track">
                  <span style={{ width: `${(row.count / maximum) * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No behavioral indicators recorded.</p>
          )}
        </section>
      </div>
      {analytics && (
        <section className="panel analytics-ledger">
          <div className="panel-heading">
            <h2>Recent high-risk transactions</h2>
          </div>
          {data.high_risk_transactions?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Merchant</th>
                    <th>Risk</th>
                    <th>Model</th>
                  </tr>
                </thead>
                <tbody>
                  {data.high_risk_transactions.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          className="row-link mono"
                          href={`/transactions?q=${row.transaction_id}`}
                        >
                          {row.transaction_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{row.transaction.merchant}</td>
                      <td>
                        {row.risk_score} / {row.risk_level}
                      </td>
                      <td>{row.model_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </section>
      )}
    </div>
  );
}
