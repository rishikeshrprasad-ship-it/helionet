#!/usr/bin/env python3
"""
Step 3: split.py
Splits data into train (1998-2018), validation (2019-2021), and test (2022-2025)
with a strict 24-hour gap between periods to eliminate temporal leakage.
Asserts there is zero overlap.
Saves train.parquet, val.parquet, test.parquet to training/data/.
"""
import os
import sys
import yaml
import json
import pandas as pd

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def main():
    cfg = load_config()
    data_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["splits_dir"])
    data_dir = os.path.normpath(data_dir)

    feat_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["features_path"])
    lbl_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["labels_path"])

    if not os.path.exists(feat_path) or not os.path.exists(lbl_path):
        raise FileNotFoundError(f"FATAL: Missing features or labels file ({feat_path}, {lbl_path}). Run earlier steps first.")

    features = pd.read_parquet(feat_path)
    labels = pd.read_parquet(lbl_path)

    merged = features.join(labels)
    # Filter for rows where both feature window and labels are valid
    valid_mask = merged["valid_mask"] & merged["valid_label_mask"]
    valid_df = merged[valid_mask].copy()

    # Time boundaries
    train_end = pd.Timestamp("2018-12-31 23:00:00")
    val_start = train_end + pd.Timedelta(hours=25)  # 24h gap
    val_end = pd.Timestamp("2021-12-31 23:00:00")
    test_start = val_end + pd.Timedelta(hours=25)   # 24h gap

    train_df = valid_df[valid_df.index <= train_end]
    val_df = valid_df[(valid_df.index >= val_start) & (valid_df.index <= val_end)]
    test_df = valid_df[valid_df.index >= test_start]

    # Strict assertion tests
    print("Verifying split isolation and asserting zero temporal overlap...")
    assert len(train_df) > 0, "Train split is empty!"
    assert len(val_df) > 0, "Validation split is empty!"
    assert len(test_df) > 0, "Test split is empty!"

    # Temporal gap checks
    gap_train_val_hours = (val_df.index.min() - train_df.index.max()).total_seconds() / 3600.0
    gap_val_test_hours = (test_df.index.min() - val_df.index.max()).total_seconds() / 3600.0

    assert gap_train_val_hours >= 24.0, f"Train-Val gap is {gap_train_val_hours}h, expected >= 24h"
    assert gap_val_test_hours >= 24.0, f"Val-Test gap is {gap_val_test_hours}h, expected >= 24h"

    # Set disjointness
    train_idx = set(train_df.index)
    val_idx = set(val_df.index)
    test_idx = set(test_df.index)

    assert len(train_idx.intersection(val_idx)) == 0, "Overlap found between Train and Validation!"
    assert len(val_idx.intersection(test_idx)) == 0, "Overlap found between Validation and Test!"
    assert len(train_idx.intersection(test_idx)) == 0, "Overlap found between Train and Test!"
    print(f"  Train: {train_df.index.min()} to {train_df.index.max()} ({len(train_df)} rows)")
    print(f"  Gap (Train -> Val): {gap_train_val_hours:.1f} hours")
    print(f"  Val:   {val_df.index.min()} to {val_df.index.max()} ({len(val_df)} rows)")
    print(f"  Gap (Val -> Test):   {gap_val_test_hours:.1f} hours")
    print(f"  Test:  {test_df.index.min()} to {test_df.index.max()} ({len(test_df)} rows)")

    # Save split files
    train_path = os.path.join(data_dir, "train.parquet")
    val_path = os.path.join(data_dir, "val.parquet")
    test_path = os.path.join(data_dir, "test.parquet")

    train_df.to_parquet(train_path)
    val_df.to_parquet(val_path)
    test_df.to_parquet(test_path)

    # Event count summary
    split_stats = {}
    for name, s_df in [("train", train_df), ("val", val_df), ("test", test_df)]:
        n_rows = len(s_df)
        n_geo = int((s_df["label_geo"] == 1).sum())
        n_proton = int((s_df["label_proton"] == 1).sum())
        split_stats[name] = {
            "rows": n_rows,
            "geo_events": n_geo,
            "geo_rate": round(n_geo / n_rows, 4) if n_rows > 0 else 0,
            "proton_events": n_proton,
            "proton_rate": round(n_proton / n_rows, 4) if n_rows > 0 else 0,
            "dst_min": float(s_df["target_dst_min"].min()),
            "dst_mean": float(s_df["target_dst_min"].mean()),
        }

    stats_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "split_stats.json")
    stats_path = os.path.normpath(stats_path)
    os.makedirs(os.path.dirname(stats_path), exist_ok=True)
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(split_stats, f, indent=2)

    print("\nSplit Event Statistics:")
    print(json.dumps(split_stats, indent=2))
    print(f"\nSUCCESS: Splits saved to {train_path}, {val_path}, {test_path}")

if __name__ == "__main__":
    main()
