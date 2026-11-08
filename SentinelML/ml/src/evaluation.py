import numpy as np
from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    precision_recall_curve,
)


def choose_threshold(
    labels, probabilities, false_negative_cost=20, false_positive_cost=1
):
    rows = []
    for threshold in np.linspace(0.01, 0.99, 99):
        tn, fp, fn, tp = confusion_matrix(
            labels, probabilities >= threshold, labels=[0, 1]
        ).ravel()
        rows.append(
            {
                "threshold": float(threshold),
                "cost": int(fn * false_negative_cost + fp * false_positive_cost),
                "precision": float(tp / max(tp + fp, 1)),
                "recall": float(tp / max(tp + fn, 1)),
            }
        )
    return min(rows, key=lambda row: row["cost"])["threshold"], rows


def evaluate(labels, probabilities, threshold):
    predicted = probabilities >= threshold
    tn, fp, fn, tp = confusion_matrix(labels, predicted, labels=[0, 1]).ravel()
    precision, recall, thresholds = precision_recall_curve(labels, probabilities)
    return {
        "precision": precision_score(labels, predicted, zero_division=0),
        "recall": recall_score(labels, predicted),
        "f1": f1_score(labels, predicted),
        "roc_auc": roc_auc_score(labels, probabilities),
        "pr_auc": average_precision_score(labels, probabilities),
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
        "false_positive_rate": float(fp / max(tn + fp, 1)),
        "false_negative_rate": float(fn / max(tp + fn, 1)),
        "precision_recall_curve": {
            "precision": precision[::20].tolist(),
            "recall": recall[::20].tolist(),
            "thresholds": thresholds[::20].tolist(),
        },
    }
