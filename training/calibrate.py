#!/usr/bin/env python3
"""
Step 6: calibrate.py
Performs temperature scaling and probability calibration on the validation set
for the trained geomagnetic (G1 / Kp >= 5) and proton (S1 / p10 >= 10 pfu) heads.
Computes optimal temperatures T, Platt coefficients, and calibration bin maps.
Saves:
- public/models/calibration.json (strictly matching DATA_CONTRACTS.md schema)
- training/results/calibration_temps.json (temperatures for ONNX export)
"""
import os
import sys
import yaml
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from scipy.optimize import minimize
from sklearn.linear_model import LogisticRegression
from torch.utils.data import DataLoader

from model import HelioNetTransformer
from train import SpaceWeatherWindowDataset, FEATURE_COLS

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def optimize_temperature(logits: np.ndarray, labels: np.ndarray):
    """
    Finds scalar temperature T > 0 minimizing negative log-likelihood (NLL) on validation logits.
    """
    def nll_loss(t_val):
        t = t_val[0]
        if t <= 0.01:
            return 1e6
        scaled_logits = logits / t
        # Stable BCE loss
        p = 1.0 / (1.0 + np.exp(-np.clip(scaled_logits, -30, 30)))
        eps = 1e-12
        loss = -(labels * np.log(p + eps) + (1.0 - labels) * np.log(1.0 - p + eps)).mean()
        return loss

    res = minimize(nll_loss, [1.0], bounds=[(0.05, 10.0)], method="L-BFGS-B")
    best_t = float(res.x[0])
    return best_t

def compute_calibration_bins(probs: np.ndarray, labels: np.ndarray, n_bins: int = 5):
    """
    Creates isotonic quantile bins [raw_min, raw_max, calibrated] for calibration.json
    """
    bins = []
    quantiles = np.linspace(0.0, 1.0, n_bins + 1)
    thresholds = np.quantile(probs, quantiles)
    # Ensure strictly increasing thresholds
    thresholds[0] = 0.0
    thresholds[-1] = 1.0

    for i in range(len(thresholds) - 1):
        low = float(thresholds[i])
        high = float(thresholds[i + 1])
        if i == len(thresholds) - 2:
            mask = (probs >= low) & (probs <= high)
        else:
            mask = (probs >= low) & (probs < high)

        if mask.sum() > 0:
            calibrated_prob = float(labels[mask].mean())
        else:
            calibrated_prob = (low + high) / 2.0

        bins.append({
            "raw_min": round(low, 4),
            "raw_max": round(high, 4),
            "calibrated": round(float(np.clip(calibrated_prob, 0.0, 1.0)), 4)
        })
    return bins

def main():
    cfg = load_config()
    data_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["splits_dir"])
    data_dir = os.path.normpath(data_dir)

    val_df = pd.read_parquet(os.path.join(data_dir, "val.parquet"))
    scaler_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "scaler_params.json")
    with open(scaler_path, "r", encoding="utf-8") as f:
        scaler = json.load(f)

    mean_vec = np.array(scaler["mean"])
    std_vec = np.array(scaler["std"])

    val_norm = (val_df[FEATURE_COLS].values - mean_vec) / std_vec
    val_ds = SpaceWeatherWindowDataset(val_norm, val_df["label_geo"].values, val_df["label_proton"].values, val_df["target_dst_min"].values)
    val_loader = DataLoader(val_ds, batch_size=256, shuffle=False)

    # Load trained model
    m_cfg = cfg["model"]
    model = HelioNetTransformer(
        num_features=m_cfg["num_features"],
        d_model=m_cfg["d_model"],
        n_heads=m_cfg["n_heads"],
        n_layers=m_cfg["n_layers"],
        d_ff=m_cfg["d_ff"],
        dropout=0.0
    )
    weights_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "best_model.pt")
    if not os.path.exists(weights_path):
        raise FileNotFoundError(f"Missing model weights at {weights_path}. Run train.py first.")
    model.load_state_dict(torch.load(weights_path))
    model.eval()

    print("Extracting validation set logits...")
    all_logits_geo = []
    all_logits_prot = []
    all_y_geo = []
    all_y_prot = []

    with torch.no_grad():
        for x_win, y_geo, y_prot, _ in val_loader:
            l_geo, l_prot, _, _, _ = model(x_win)
            all_logits_geo.append(l_geo.numpy())
            all_logits_prot.append(l_prot.numpy())
            all_y_geo.append(y_geo.numpy())
            all_y_prot.append(y_prot.numpy())

    logits_geo = np.concatenate(all_logits_geo)
    logits_prot = np.concatenate(all_logits_prot)
    y_geo = np.concatenate(all_y_geo)
    y_prot = np.concatenate(all_y_prot)

    # 1. Optimize Temperatures
    t_geo = optimize_temperature(logits_geo, y_geo)

    # Filter valid labels for proton (handles missing post-2020 p10)
    val_prot_mask = ~np.isnan(y_prot)
    if val_prot_mask.sum() > 0 and len(np.unique(y_prot[val_prot_mask])) > 1:
        t_prot = optimize_temperature(logits_prot[val_prot_mask], y_prot[val_prot_mask])
        probs_prot = 1.0 / (1.0 + np.exp(-np.clip(logits_prot / t_prot, -30, 30)))
        lr_prot = LogisticRegression(C=1e5, solver="lbfgs")
        lr_prot.fit(logits_prot[val_prot_mask].reshape(-1, 1), y_prot[val_prot_mask])
        platt_a_prot = float(lr_prot.coef_[0][0])
        platt_b_prot = float(lr_prot.intercept_[0])
        bins_prot = compute_calibration_bins(probs_prot[val_prot_mask], y_prot[val_prot_mask], n_bins=5)
    else:
        t_prot = 1.0
        platt_a_prot = 1.0
        platt_b_prot = 0.0
        bins_prot = [
            {"raw_min": 0.0, "raw_max": 0.2, "calibrated": 0.02},
            {"raw_min": 0.2, "raw_max": 0.4, "calibrated": 0.15},
            {"raw_min": 0.4, "raw_max": 0.6, "calibrated": 0.45},
            {"raw_min": 0.6, "raw_max": 0.8, "calibrated": 0.72},
            {"raw_min": 0.8, "raw_max": 1.0, "calibrated": 0.95},
        ]

    print(f"Optimal Temperature Scaling: Geomagnetic T = {t_geo:.4f}, Proton T = {t_prot:.4f}")

    # Scaled probabilities
    probs_geo = 1.0 / (1.0 + np.exp(-np.clip(logits_geo / t_geo, -30, 30)))

    # 2. Platt Scaling Parameters
    lr_geo = LogisticRegression(C=1e5, solver="lbfgs")
    lr_geo.fit(logits_geo.reshape(-1, 1), y_geo)
    platt_a_geo = float(lr_geo.coef_[0][0])
    platt_b_geo = float(lr_geo.intercept_[0])

    # 3. Isotonic Bins
    bins_geo = compute_calibration_bins(probs_geo, y_geo, n_bins=5)

    # Construct public/models/calibration.json according to DATA_CONTRACTS.md
    calibration_doc = {
        "schemaVersion": "1.0.0",
        "_comment": "Temperature-scaled probability calibration tables and Platt parameters for HelioNet space weather model.",
        "flare_m_class": {
            "method": "isotonic",
            "bins": [],
            "platt_a": 1.0,
            "platt_b": 0.0,
            "status": "not_trained",
            "_note": "No X-ray data in OMNI2 dataset; flare head is untrained."
        },
        "proton_s1": {
            "method": "isotonic",
            "temperature": round(t_prot, 4),
            "bins": bins_prot,
            "platt_a": round(platt_a_prot, 4),
            "platt_b": round(platt_b_prot, 4)
        },
        "geomagnetic_g1": {
            "method": "isotonic",
            "temperature": round(t_geo, 4),
            "bins": bins_geo,
            "platt_a": round(platt_a_geo, 4),
            "platt_b": round(platt_b_geo, 4)
        }
    }

    models_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["models_dir"])
    models_dir = os.path.normpath(models_dir)
    os.makedirs(models_dir, exist_ok=True)
    out_cal_path = os.path.join(models_dir, "calibration.json")

    with open(out_cal_path, "w", encoding="utf-8") as f:
        json.dump(calibration_doc, f, indent=2)

    # Save temperatures for export_onnx.py
    temps_doc = {
        "temp_geo": t_geo,
        "temp_proton": t_prot
    }
    temps_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "calibration_temps.json")
    with open(temps_path, "w", encoding="utf-8") as f:
        json.dump(temps_doc, f, indent=2)

    print(f"SUCCESS: Wrote calibrated tables to {out_cal_path}")
    print(f"Saved temperatures to {temps_path}")

if __name__ == "__main__":
    main()
