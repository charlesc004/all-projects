export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "risk_manager" | "viewer";
  organization: { id: string; name: string };
  disabled?: boolean;
  notification_preferences?: { alerts: boolean };
};
export type Transaction = {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  country: string;
  account_token: string;
  created_at: string;
  velocity_hour: number;
  new_device: boolean;
  device_trust: number;
};
export type Assessment = {
  id: string;
  transaction_id: string;
  transaction: Transaction;
  risk_score: number;
  risk_level: string;
  fraud_probability: number;
  decision_threshold: number;
  model_version: string;
  feature_version: string;
  features: number[];
  risk_indicators: string[];
  inference_latency_ms: number;
  created_at: string;
};
export type Alert = {
  id: string;
  severity: string;
  status: string;
  policy: string;
  case_id: string | null;
  lock_version: number;
  created_at: string;
  assessment: Assessment;
};
export type Case = {
  id: string;
  status: string;
  outcome: string | null;
  lock_version: number;
  assigned_user_id: string | null;
  assigned_user: string | null;
  notes: { id: string; author: string; text: string; at: string }[];
  created_at: string;
  alert: Alert;
};
export type Model = {
  id: string;
  version: string;
  active: boolean;
  metadata: {
    model_type: string;
    trained_at: string;
    decision_threshold: number;
    artifact_checksum: string;
    feature_names: string[];
    feature_importance?: Record<string, number>;
    dataset_version?: string;
    metrics: {
      precision: number;
      recall: number;
      f1: number;
      roc_auc: number;
      pr_auc: number;
      confusion_matrix: number[][];
      precision_recall_curve?: {
        precision: number[];
        recall: number[];
        thresholds: number[];
      };
    };
  };
};
export type Policy = {
  id: string;
  name: string;
  severity: string;
  enabled: boolean;
  open_case: boolean;
  priority: number;
  lock_version: number;
  conditions: Record<string, number | boolean>;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
};
export type Dashboard = {
  transactions: number;
  alerts: number;
  high_risk: number;
  open_cases: number;
  trend: { date: string; transactions: number; high_risk: number }[];
  risk_distribution: { name: string; value: number }[];
  recent_alerts: Alert[];
  recent_cases?: Case[];
  high_risk_transactions?: Assessment[];
  top_indicators?: { name: string; count: number }[];
  model: Model | null;
  observed_at: string;
};
export type Audit = {
  id: string;
  action: string;
  actor_id: string | null;
  resource_type: string;
  resource_id: string;
  created_at: string;
};
