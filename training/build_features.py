#!/usr/bin/env python3
"""
Step 1: build_features.py
Parses OMNI2 hourly files (1998-2025) strictly according to training/data/omni2.text.
Replaces fill values with NaN, interpolates gaps <= 3h, computes 24h rolling maxima,
and saves the unified 15-feature table to training/data/features.parquet.
"""
import os
import sys
import yaml
import numpy as np
import pandas as pd

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    if not os.path.exists(cfg_path):
        raise FileNotFoundError(f"Missing config file: {cfg_path}")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def parse_omni2_file(filepath: str) -> pd.DataFrame:
    """
    Parses a single OMNI2 hourly file strictly using column layout from omni2.text.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"FATAL: Required raw OMNI2 data file missing: {filepath}")

    records = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            parts = line.split()
            if len(parts) < 51:
                continue

            try:
                year = int(parts[0])        # Word 1: Year
                day = int(parts[1])         # Word 2: Decimal Day
                hour = int(parts[2])        # Word 3: Hour

                # Word 9 (index 8): B Magnitude Average |B|, fill 999.9 (nT)
                raw_b_mag = float(parts[8])
                b_mag = np.nan if raw_b_mag >= 999.0 else raw_b_mag

                # Word 17 (index 16): Bz GSM, fill 999.9 (nT)
                raw_bz_gsm = float(parts[16])
                bz_gsm = np.nan if abs(raw_bz_gsm) >= 999.0 else raw_bz_gsm

                # Word 23 (index 22): Proton Temperature, fill 9999999. (K)
                raw_temp = float(parts[22])
                temperature = np.nan if raw_temp >= 9999990.0 else raw_temp

                # Word 24 (index 23): Proton Density, fill 999.9 (N/cm^3)
                raw_dens = float(parts[23])
                density = np.nan if raw_dens >= 999.0 else raw_dens

                # Word 25 (index 24): Plasma (Flow) Speed, fill 9999. (km/s)
                raw_vsw = float(parts[24])
                vsw = np.nan if raw_vsw >= 9990.0 else raw_vsw

                # Word 29 (index 28): Flow Pressure, fill 99.99 (nPa)
                raw_press = float(parts[28])
                flow_pressure = np.nan if raw_press >= 99.90 else raw_press

                # Word 39 (index 38): Kp index, fill 99. Scaled by 10 (e.g. 33=3+, 50=5.0)
                raw_kp = float(parts[38])
                kp = np.nan if raw_kp >= 98.0 else (raw_kp / 10.0)

                # Word 40 (index 39): Sunspot number R, fill 999
                raw_r = float(parts[39])
                sunspot = np.nan if raw_r >= 998.0 else raw_r

                # Word 41 (index 40): Dst Index, fill 99999 (nT)
                raw_dst = float(parts[40])
                dst = np.nan if abs(raw_dst) >= 99990.0 else raw_dst

                # Word 46 (index 45): Proton flux >= 10 MeV, fill 99999.99 (pfu)
                raw_p10 = float(parts[45])
                p10 = np.nan if raw_p10 >= 99990.0 else raw_p10

                # Word 51 (index 50): F10.7 index, fill 999.9 (sfu)
                raw_f107 = float(parts[50])
                f107 = np.nan if raw_f107 >= 999.0 else raw_f107

                records.append({
                    "year": year,
                    "day": day,
                    "hour": hour,
                    "b_mag": b_mag,
                    "bz_gsm": bz_gsm,
                    "vsw": vsw,
                    "density": density,
                    "temperature": temperature,
                    "flow_pressure": flow_pressure,
                    "kp": kp,
                    "dst": dst,
                    "f107": f107,
                    "sunspot": sunspot,
                    "p10": p10,
                })
            except Exception as e:
                raise ValueError(f"Error parsing line {line_num} in {filepath}: {e}")

    df = pd.DataFrame(records)
    # Construct exact timestamp
    df["timestamp"] = pd.to_datetime(df["year"].astype(str) + "-" + df["day"].astype(str) + " " + df["hour"].astype(str) + ":00:00", format="%Y-%j %H:%M:%S")
    df.set_index("timestamp", inplace=True)
    df.drop(columns=["year", "day", "hour"], inplace=True)
    return df

def main():
    cfg = load_config()
    raw_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["raw_dir"]) if not os.path.isabs(cfg["paths"]["raw_dir"]) else cfg["paths"]["raw_dir"]
    raw_dir = os.path.normpath(raw_dir)

    omni_text = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["omni_text"]) if not os.path.isabs(cfg["paths"]["omni_text"]) else cfg["paths"]["omni_text"]
    if not os.path.exists(omni_text):
        raise FileNotFoundError(f"FATAL: Missing schema document omni2.text at: {omni_text}")

    train_start = cfg["splits"]["train_years"][0]
    test_end = cfg["splits"]["test_years"][1]
    years = list(range(train_start, test_end + 1))

    print(f"Building features from {len(years)} raw files ({years[0]}-{years[-1]})...")

    dfs = []
    for y in years:
        fname = f"omni2_{y}.dat"
        fpath = os.path.join(raw_dir, fname)
        if not os.path.exists(fpath):
            raise FileNotFoundError(f"FATAL: Missing raw input file for year {y}: {fpath}. Pipeline cannot continue.")
        print(f"  Parsing {fname}...")
        df_y = parse_omni2_file(fpath)
        dfs.append(df_y)

    full_df = pd.concat(dfs).sort_index()

    # Reindex to full uniform hourly frequency
    full_idx = pd.date_range(start=full_df.index.min(), end=full_df.index.max(), freq="h")
    full_df = full_df.reindex(full_idx)
    full_df.index.name = "timestamp"

    print(f"Loaded {len(full_df)} total hourly records ({full_df.index.min()} to {full_df.index.max()})")

    # 11 base features
    base_cols = [
        "b_mag", "bz_gsm", "vsw", "density", "temperature",
        "flow_pressure", "kp", "dst", "f107", "sunspot", "p10"
    ]

    # Interpolate gaps up to 3 hours, mask longer gaps
    print("Interpolating gaps <= 3h...")
    interpolated = full_df[base_cols].interpolate(method="linear", limit=3, limit_direction="forward")

    # Track core valid mask: rows where observed core features (b_mag, bz_gsm, vsw, kp, dst) are non-null
    core_cols = ["b_mag", "bz_gsm", "vsw", "kp", "dst"]
    core_valid = interpolated[core_cols].notna().all(axis=1)

    # For neural network input stability, fill remaining long gaps (e.g. p10 after 2020) with training medians
    train_mask = full_df.index <= "2018-12-31 23:00:00"
    train_medians = full_df.loc[train_mask, base_cols].median()
    # Fallback default values if any median is NaN
    defaults = {
        "b_mag": 5.4, "bz_gsm": 0.0, "vsw": 420.0, "density": 5.0, "temperature": 80000.0,
        "flow_pressure": 1.8, "kp": 2.0, "dst": -15.0, "f107": 120.0, "sunspot": 50.0, "p10": 0.21
    }
    for col, default_val in defaults.items():
        if pd.isna(train_medians.get(col, np.nan)):
            train_medians[col] = default_val

    filled = interpolated.fillna(train_medians)

    # Rolling 24h maxima (4 features to reach 15 features total)
    print("Computing rolling 24h maxima...")
    filled["b_mag_max24"] = filled["b_mag"].rolling(24, min_periods=1).max()
    filled["vsw_max24"] = filled["vsw"].rolling(24, min_periods=1).max()
    filled["flow_pressure_max24"] = filled["flow_pressure"].rolling(24, min_periods=1).max()
    filled["p10_max24"] = filled["p10"].rolling(24, min_periods=1).max()

    feature_cols = [
        "b_mag", "bz_gsm", "vsw", "density", "temperature",
        "flow_pressure", "kp", "dst", "f107", "sunspot", "p10",
        "b_mag_max24", "vsw_max24", "flow_pressure_max24", "p10_max24"
    ]
    assert len(feature_cols) == 15, f"Expected 15 features, got {len(feature_cols)}"

    out_df = filled[feature_cols].copy()
    out_df["valid_mask"] = core_valid.astype(bool)

    out_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["features_path"])
    out_path = os.path.normpath(out_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out_df.to_parquet(out_path)

    valid_count = out_df["valid_mask"].sum()
    print(f"SUCCESS: Saved {len(out_df)} rows ({valid_count} valid, {len(out_df) - valid_count} masked) to {out_path}")
    print(f"Features (15): {feature_cols}")

if __name__ == "__main__":
    main()
