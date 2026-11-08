import numpy as np


def population_stability_index(reference, observed, bins=10):
    edges = np.unique(np.quantile(reference, np.linspace(0, 1, bins + 1)))
    if len(edges) < 2:
        return 0.0 if np.all(np.asarray(observed) == reference[0]) else float("inf")
    edges[0], edges[-1] = -np.inf, np.inf
    left = np.histogram(reference, edges)[0].astype(float) + 0.5
    right = np.histogram(observed, edges)[0].astype(float) + 0.5
    left, right = left / left.sum(), right / right.sum()
    return float(np.sum((right - left) * np.log(right / left)))
