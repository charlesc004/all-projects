"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, ErrorState, Skeleton } from "@/components/ui/shared";
type Monitoring = {
  status: string;
  operational?: { status: string; values: Record<string, number | null> };
  model_version?: string;
  features: {
    name: string;
    samples: number;
    psi: number | null;
    status: string;
  }[];
  feedback: {
    labeled: number;
    precision: number | null;
    recall: number | null;
    true_positive: number;
    false_positive: number;
    true_negative: number;
    false_negative: number;
  };
};
export function DriftPanel() {
  const query = useQuery({
    queryKey: ["model-monitoring"],
    queryFn: () => api<Monitoring>("/monitoring"),
    refetchInterval: 15000,
  });
  if (query.isPending) return <Skeleton />;
  if (query.error) return <ErrorState error={query.error} />;
  const data = query.data;
  return (
    <section className="panel drift-panel">
      <div className="panel-heading">
        <div>
          <h2>Feature drift & reviewed outcomes</h2>
          <p>
            Population Stability Index against training data · latest 5,000
            assessments · {data.model_version || "No active model"}
          </p>
        </div>
        <Badge value={data.status} />
      </div>
      {data.operational && (
        <div className="model-metrics">
          {Object.entries({
            incoming_per_second: "Incoming / second",
            scoring_per_second: "Scored / second",
            inference_p95_seconds: "Inference p95 (seconds)",
            consumer_lag: "Consumer partition lag",
            model_loaded: "Model loaded",
            service_scrapes_up: "Service scrapes up / 3",
          }).map(([key, label]) => (
            <div key={key}>
              <span>{label}</span>
              <strong>
                {data.operational!.values[key] == null
                  ? "Unavailable"
                  : data.operational!.values[key]!.toFixed(
                      key.includes("second") ? 3 : 0,
                    )}
              </strong>
            </div>
          ))}
          <p className="muted">
            Shared service telemetry -{" "}
            {data.operational.status === "measured"
              ? "Prometheus observations; rates require two scrapes"
              : "Metrics service unavailable"}
          </p>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Observed samples</th>
              <th>PSI</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.features.map((feature) => (
              <tr key={feature.name}>
                <td>{feature.name.replaceAll("_", " ")}</td>
                <td>{feature.samples}</td>
                <td>{feature.psi === null ? "—" : feature.psi.toFixed(4)}</td>
                <td>
                  <Badge value={feature.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="model-metrics">
        <div>
          <span>Reviewed labels</span>
          <strong>{data.feedback.labeled}</strong>
        </div>
        <div>
          <span>Observed precision</span>
          <strong>
            {data.feedback.precision == null
              ? "—"
              : `${(data.feedback.precision * 100).toFixed(1)}%`}
          </strong>
        </div>
        <div>
          <span>Observed recall</span>
          <strong>
            {data.feedback.recall == null
              ? "—"
              : `${(data.feedback.recall * 100).toFixed(1)}%`}
          </strong>
        </div>
      </div>
      <div className="panel-note">
        Drift requires at least 50 observations. PSI ≥ 0.10 is a watch signal
        and ≥ 0.25 indicates material distribution shift. Reviewed-outcome
        metrics use the latest conclusive feedback per transaction and describe
        the reviewed sample, not all transactions.
      </div>
    </section>
  );
}
