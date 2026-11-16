#!/usr/bin/env python3
"""
Step 2: build_labels.py
Constructs 24-hour ahead prediction labels from features.parquet:
- label_proton: binary, 1 if max proton flux >= 10 pfu over next 24h, else 0
- label_geo: binary, 1 if max Kp >= 5.0 over next 24h, else 0
- target_dst_min: continuous, minimum Dst (nT) over next 24h
- label_flare: null (NO training data in OMNI2)
Saves to training/data/labels.parquet.
"""
import os
import sys
import yaml
import numpy as np
import pandas as pd

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def forward_rolling(series: pd.Series, window: int = 24, agg: str = "max", min_periods: int = 12) -> pd.Series:
    """
    Computes rolling forward aggregation for hours t+1 to t+window.
    """
    rev = series.iloc[::-1]
    if agg == "max":
        r = rev.rolling(window=window, min_periods=min_periods).max()
    elif agg == "min":
        r = rev.rolling(window=window, min_periods=min_periods).min()
    else:
        raise ValueError(f"Unknown agg: {agg}")
    return r.iloc[::-1].shift(-1)

def main():
    cfg = load_config()
    features_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["features_path"])
    features_path = os.path.normpath(features_path)

    if not os.path.exists(features_path):
        raise FileNotFoundError(f"FATAL: Missing features table: {features_path}. Run build_features.py first.")

    print(f"Loading features from {features_path}...")
    df = pd.read_parquet(features_path)

    print("Computing 24-hour forward prediction targets...")
    # 1. Proton event: proton flux >= 10 pfu at >= 10 MeV
    future_p10_max = forward_rolling(df["p10"], window=24, agg="max", min_periods=12)
    label_proton = pd.Series(np.nan, index=df.index, name="label_proton")
    valid_p10 = future_p10_max.notna()
    label_proton[valid_p10] = (future_p10_max[valid_p10] >= 10.0).astype(float)

    # 2. Geomagnetic storm: Kp >= 5.0
    future_kp_max = forward_rolling(df["kp"], window=24, agg="max", min_periods=12)
    label_geo = pd.Series(np.nan, index=df.index, name="label_geo")
    valid_kp = future_kp_max.notna()
    label_geo[valid_kp] = (future_kp_max[valid_kp] >= 5.0).astype(float)

    # 3. Minimum Dst index over next 24h
    future_dst_min = forward_rolling(df["dst"], window=24, agg="min", min_periods=12)
    target_dst_min = future_dst_min.rename("target_dst_min")

    # 4. Flare head: NO training data in OMNI2 -> explicitly null/NaN
    label_flare = pd.Series(np.nan, index=df.index, name="label_flare")

    labels_df = pd.DataFrame({
        "label_proton": label_proton,
        "label_geo": label_geo,
        "target_dst_min": target_dst_min,
        "label_flare": label_flare,
    }, index=df.index)

    labels_df["valid_label_mask"] = (
        labels_df["label_geo"].notna() &
        labels_df["target_dst_min"].notna()
    )

    out_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["labels_path"])
    out_path = os.path.normpath(out_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    labels_df.to_parquet(out_path)

    valid_cnt = labels_df["valid_label_mask"].sum()
    proton_events = (labels_df.loc[labels_df["valid_label_mask"], "label_proton"] == 1).sum()
    geo_events = (labels_df.loc[labels_df["valid_label_mask"], "label_geo"] == 1).sum()

    print(f"SUCCESS: Saved labels to {out_path}")
    print(f"Total rows: {len(labels_df)}, Valid: {valid_cnt}")
    print(f"Proton storm events (>= 10 pfu): {proton_events} ({proton_events / valid_cnt * 100:.2f}%)")
    print(f"Geomagnetic storm events (Kp >= 5): {geo_events} ({geo_events / valid_cnt * 100:.2f}%)")
    print(f"Dst min range: {labels_df['target_dst_min'].min():.1f} nT to {labels_df['target_dst_min'].max():.1f} nT")
    print("Flare head: set to null across all rows (no X-ray data in dataset).")

if __name__ == "__main__":
    main()
