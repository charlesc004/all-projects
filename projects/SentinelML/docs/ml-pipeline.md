# Training, evaluation, and inference

`python -m ml.src.train --output ml/artifacts/v1` generates 18,000 synthetic examples with seed 42 and approximately 6.5% fraud. A latent fraud/normal mixture produces overlapping amount, account-age, velocity, device, distance, failure, and location distributions. Labels are related to behavior, not independent random assignments. This remains a comparatively easy synthetic problem, not a representative real-world benchmark.

The ordered features-v1 contract is: log_amount, account_age_days, velocity_hour, device_trust, distance_km, failed_attempts, new_device, country_mismatch, hour_utc. The Rust extraction order matches Python. Amount is log1p-transformed; flags become float32 0/1, and hour comes from UTC. Real transaction ingestion requires finite, nonnegative behavioral signals. The current system trusts supplied aggregate behavior rather than maintaining account history itself.

The pipeline uses an imputer and a 100-tree RandomForestClassifier with balanced_subsample class weights, maximum depth 10, and minimum leaf size 5. The first 60% of ordered samples train the model, the next 20% select the threshold, and the last 20% form an untouched holdout set. Threshold selection minimizes validation false negatives × 20 + false positives × 1. Test labels do not influence this choice.

ONNX export disables ZipMap to return a dense [batch, 2] probability tensor, which Rust reads at class index 1. Export is checked by ONNX and then compared with scikit-learn on 100 holdout rows at absolute tolerance 1e-5. The bundle includes model.onnx, metadata.json, metrics.json, feature_schema.json, checksum.sha256, and threshold_comparison.json. Metadata records feature order, data version, split sizes, seed, timestamp, checksum, threshold, and genuine evaluation metrics.

The committed bundle's measured test metrics are reported in `ml/artifacts/v1/metrics.json`. Re-training with newer dependency versions can change results; `ml/requirements.lock.txt` records the exact Windows verification environment, while requirements.txt provides cross-platform dependency ranges.

Rust checks SHA-256, feature version/order, threshold, and output shape and warms the real model before serving. Missing or corrupt artifacts fail validation. Model versions are immutable. Mount the version directories under the shared artifact root; administrators/risk managers use **Discover validated model bundles**, then activate the desired version. Rust commits the tenant deployment and model.activated.v1 outbox event atomically; Rails projects it idempotently. Prior versions remain available for rollback without restarting inference. In-flight assessments retain the original version. `MODEL_DIR` supplies the default version for organizations without a deployment override.

Risk indicators are named observations such as a new device or high velocity. They are heuristics, not SHAP attributions. Model probability, indicators, and matched business policies are displayed separately. SHAP is optional and not implemented.

The training manifest stores reference histogram counts and edges. Rails calculates observed PSI from the latest 5,000 persisted assessments for the organization's active model. At least 50 observations are required; absent evidence is shown as insufficient data, not zero drift. The UI displays per-feature PSI and reviewed precision/recall. Feedback metrics use the latest conclusive label per transaction and describe a selected review population.

v1 and v2 preserve their historical manifests. v3 (seed 44) additionally records the actual forest's feature_importances_; the model center compares versions and shows these measured importances. They describe the training forest, not transaction-specific causal explanations. Synthetic v3 holdout: precision 0.933333, recall 0.954545, F1 0.943820, ROC-AUC 0.998729, PR-AUC 0.987798; matrix [[3365,15],[10,210]]. v1 remains the demo default after verification.

Training refuses an existing output bundle. Choose a new version:

```sh
python -m ml.src.train --output ml/artifacts/v4 --size 18000 --seed 45 --false-negative-cost 20 --false-positive-cost 1
# Caller-licensed mapped chronological dataset:
python -m ml.src.train --output ml/artifacts/reviewed-v1 --csv ml/datasets/reviewed.csv
# Export /api/feedback through an authenticated session, review labels, then:
python -m ml.src.feedback --input reviewed-feedback.json --output ml/datasets/reviewed.csv
```

The feedback converter deduplicates transaction labels, excludes inconclusive outcomes, validates feature version/finiteness, reconstructs amount from log_amount and retains transaction time. It writes an offline input only. Review selection bias, label quality, class coverage and licensing before training. Missing offline feature values are handled by the fitted training imputer; live ingestion continues to reject nonfinite values. No automatic feedback-driven deployment occurs.
