use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const FEATURES: [&str; 9] = [
    "log_amount",
    "account_age_days",
    "velocity_hour",
    "device_trust",
    "distance_km",
    "failed_attempts",
    "new_device",
    "country_mismatch",
    "hour_utc",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Transaction {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub account_token: String,
    pub merchant: String,
    pub amount: f64,
    pub currency: String,
    pub country: String,
    pub account_age_days: f64,
    pub velocity_hour: f64,
    pub device_trust: f64,
    pub distance_km: f64,
    pub failed_attempts: f64,
    pub new_device: bool,
    pub country_mismatch: bool,
    pub created_at: DateTime<Utc>,
}

impl Transaction {
    pub fn features(&self) -> anyhow::Result<Vec<f32>> {
        use chrono::Timelike;
        anyhow::ensure!(
            self.amount > 0.0 && self.amount <= 10_000_000.0,
            "amount outside bounds"
        );
        anyhow::ensure!(
            (0.0..=1.0).contains(&self.device_trust),
            "invalid device trust"
        );
        let values = vec![
            self.amount.ln_1p() as f32,
            self.account_age_days as f32,
            self.velocity_hour as f32,
            self.device_trust as f32,
            self.distance_km as f32,
            self.failed_attempts as f32,
            u8::from(self.new_device) as f32,
            u8::from(self.country_mismatch) as f32,
            self.created_at.hour() as f32,
        ];
        anyhow::ensure!(
            values.iter().all(|v| v.is_finite() && *v >= 0.0),
            "nonfinite or negative feature"
        );
        Ok(values)
    }
    pub fn indicators(&self) -> Vec<String> {
        let mut result = vec![];
        for (matched, name) in [
            (self.amount > 2000.0, "LARGE_TRANSACTION_AMOUNT"),
            (self.new_device, "NEW_DEVICE"),
            (self.velocity_hour > 5.0, "HIGH_TRANSACTION_VELOCITY"),
            (self.country_mismatch, "COUNTRY_MISMATCH"),
            (self.device_trust < 0.3, "LOW_DEVICE_TRUST"),
        ] {
            if matched {
                result.push(name.to_owned());
            }
        }
        result
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Event<T> {
    pub event_id: Uuid,
    pub event_type: String,
    pub schema_version: u32,
    pub organization_id: Uuid,
    pub transaction_id: Uuid,
    pub correlation_id: Uuid,
    pub occurred_at: DateTime<Utc>,
    pub payload: T,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_parent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Score {
    pub transaction: Transaction,
    pub model_version: String,
    pub feature_version: String,
    pub fraud_probability: f32,
    pub risk_score: i32,
    pub risk_level: String,
    pub decision_threshold: f32,
    pub inference_latency_ms: f64,
    pub risk_indicators: Vec<String>,
    pub features: Vec<f32>,
}

pub fn risk(probability: f32) -> (i32, &'static str) {
    let score = (probability * 100.0).round() as i32;
    (
        score,
        match score {
            90..=100 => "critical",
            70..=89 => "high",
            40..=69 => "medium",
            _ => "low",
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shared_contract_and_features() {
        let event: Event<Transaction> = serde_json::from_str(include_str!(
            "../../../contracts/fixtures/transaction.received.v1.json"
        ))
        .unwrap();
        let values = event.payload.features().unwrap();
        assert_eq!(values.len(), FEATURES.len());
        assert!((values[0] - 241.0_f32.ln()).abs() < 1e-5);
        assert_eq!(risk(0.94), (94, "critical"));
        assert_eq!(risk(0.2), (20, "low"));
    }
}
