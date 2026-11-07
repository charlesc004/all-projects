use crate::domain::{risk, Score, Transaction, FEATURES};
use ort::{session::Session, value::Tensor};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{path::Path, time::Instant};

pub struct Model {
    pub session: Session,
    pub metadata: Value,
}
#[derive(Debug, thiserror::Error)]
pub enum ModelError {
    #[error("model checksum mismatch")]
    ChecksumMismatch,
    #[error("classifier returned an invalid fraud probability")]
    InvalidProbability,
}
impl Model {
    pub fn load(directory: &Path) -> anyhow::Result<Self> {
        let metadata: Value =
            serde_json::from_slice(&std::fs::read(directory.join("metadata.json"))?)?;
        let bytes = std::fs::read(directory.join("model.onnx"))?;
        let checksum = format!("{:x}", Sha256::digest(&bytes));
        if metadata["artifact_checksum"].as_str() != Some(checksum.as_str()) {
            return Err(ModelError::ChecksumMismatch.into());
        }
        anyhow::ensure!(
            metadata["feature_version"] == "features-v1",
            "incompatible feature version"
        );
        anyhow::ensure!(
            metadata["feature_names"] == serde_json::json!(FEATURES),
            "incompatible feature order"
        );
        anyhow::ensure!(
            metadata["model_version"]
                .as_str()
                .is_some_and(|s| !s.is_empty()),
            "missing model version"
        );
        let threshold = metadata["decision_threshold"]
            .as_f64()
            .ok_or_else(|| anyhow::anyhow!("missing threshold"))?;
        anyhow::ensure!((0.0..=1.0).contains(&threshold), "invalid threshold");
        let session = Session::builder()?
            .with_intra_threads(2)?
            .commit_from_file(directory.join("model.onnx"))?;
        let mut model = Self { session, metadata };
        // Warm-up validates output shape before readiness succeeds.
        model.predict(vec![0.0; FEATURES.len()])?;
        Ok(model)
    }
    fn predict(&mut self, features: Vec<f32>) -> anyhow::Result<f32> {
        let tensor = Tensor::from_array(([1usize, FEATURES.len()], features.into_boxed_slice()))?;
        let outputs = self.session.run(ort::inputs![tensor])?;
        let (_, probabilities) = outputs[1].try_extract_tensor::<f32>()?;
        anyhow::ensure!(
            probabilities.len() == 2,
            "unexpected classifier probability shape"
        );
        let probability = probabilities[1];
        if !probability.is_finite() || !(0.0..=1.0).contains(&probability) {
            return Err(ModelError::InvalidProbability.into());
        }
        Ok(probability)
    }
    pub fn score(&mut self, transaction: Transaction) -> anyhow::Result<Score> {
        let started = Instant::now();
        let features = transaction.features()?;
        let probability = self.predict(features.clone())?;
        let (risk_score, risk_level) = risk(probability);
        let indicators = transaction.indicators();
        Ok(Score {
            transaction,
            model_version: self.metadata["model_version"].as_str().unwrap().to_owned(),
            feature_version: "features-v1".into(),
            fraud_probability: probability,
            risk_score,
            risk_level: risk_level.into(),
            decision_threshold: self.metadata["decision_threshold"].as_f64().unwrap() as f32,
            inference_latency_ms: started.elapsed().as_secs_f64() * 1000.0,
            risk_indicators: indicators,
            features,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn real_onnx_artifact() {
        let directory = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../ml/artifacts/v1");
        let mut model = Model::load(&directory).expect("train and commit the test model first");
        let event: crate::domain::Event<Transaction> = serde_json::from_str(include_str!(
            "../../../contracts/fixtures/transaction.received.v1.json"
        ))
        .unwrap();
        let low = model.score(event.payload.clone()).unwrap();
        let mut suspicious = event.payload;
        suspicious.amount = 6000.0;
        suspicious.velocity_hour = 12.0;
        suspicious.device_trust = 0.01;
        suspicious.new_device = true;
        suspicious.country_mismatch = true;
        suspicious.failed_attempts = 5.0;
        suspicious.distance_km = 2000.0;
        let high = model.score(suspicious).unwrap();
        assert!(high.fraud_probability > low.fraud_probability);
    }
}
