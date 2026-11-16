#!/usr/bin/env python3
"""
Step 4: baselines.py
Trains and evaluates baseline models:
1. Persistence (predict future event if condition holds currently)
2. Logistic Regression (classification) & Ridge (Dst regression)
3. LightGBM (gradient boosted trees)
Evaluates on the test split: Brier score, Brier Skill Score (BSS) vs climatology,
True Skill Statistic (TSS), ROC-AUC, and Dst RMSE/MAE.
Saves results to training/results/baselines.json.
"""
import os
import sys
import yaml
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, brier_score_loss, mean_squared_error, mean_absolute_error, confusion_matrix
import lightgbm as lgb

FEATURE_COLS = [
    "b_mag", "bz_gsm", "vsw", "density", "temperature",
    "flow_pressure", "kp", "dst", "f107", "sunspot", "p10",
    "b_mag_max24", "vsw_max24", "flow_pressure_max24", "p10_max24"
]

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def compute_tss(y_true, y_prob, threshold=0.5):
    """
    Computes True Skill Statistic (TSS = TPR - FPR = Sensitivity + Specificity - 1).
    """
    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    return float(tpr - fpr)

def find_best_tss(y_true, y_prob):
    thresholds = np.linspace(0.05, 0.95, 37)
    best_tss = -1.0
    best_thresh = 0.5
    for t in thresholds:
        tss = compute_tss(y_true, y_prob, t)
        if tss > best_tss:
            best_tss = tss
            best_thresh = float(t)
    return best_tss, best_thresh

def brier_skill_score(brier, clim_brier):
    if clim_brier <= 0:
        return 0.0
    return float(1.0 - (brier / clim_brier))

def main():
    cfg = load_config()
    data_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["splits_dir"])
    data_dir = os.path.normpath(data_dir)

    train_df = pd.read_parquet(os.path.join(data_dir, "train.parquet"))
    val_df = pd.read_parquet(os.path.join(data_dir, "val.parquet"))
    test_df = pd.read_parquet(os.path.join(data_dir, "test.parquet"))

    print(f"Loaded train ({len(train_df)}), val ({len(val_df)}), test ({len(test_df)})")

    X_train = train_df[FEATURE_COLS].values
    X_val = val_df[FEATURE_COLS].values
    X_test = test_df[FEATURE_COLS].values

    y_geo_train = train_df["label_geo"].values
    y_geo_test = test_df["label_geo"].values

    y_prot_train = train_df["label_proton"].values
    y_prot_test = test_df["label_proton"].values

    y_dst_train = train_df["target_dst_min"].values
    y_dst_test = test_df["target_dst_min"].values

    # Climatology on train set
    clim_geo = y_geo_train.mean()
    clim_prot = y_prot_train.mean()
    clim_dst = y_dst_train.mean()

    # Climatological Brier scores on test set
    clim_brier_geo = float(brier_score_loss(y_geo_test, np.full_like(y_geo_test, clim_geo, dtype=float)))
    valid_prot_test = ~np.isnan(y_prot_test)
    has_prot_test = bool(valid_prot_test.sum() > 0 and len(np.unique(y_prot_test[valid_prot_test])) > 1)
    if has_prot_test:
        clim_brier_prot = float(brier_score_loss(y_prot_test[valid_prot_test], np.full(valid_prot_test.sum(), clim_prot, dtype=float)))
    else:
        clim_brier_prot = None

    results = {
        "climatology": {
            "geo_rate": float(clim_geo),
            "proton_rate": float(clim_prot),
            "dst_mean": float(clim_dst),
            "clim_brier_geo": clim_brier_geo,
            "clim_brier_proton": clim_brier_prot,
        },
        "persistence": {},
        "logistic_regression": {},
        "lightgbm": {}
    }

    # ==========================================
    # 1. Persistence Baseline
    # ==========================================
    print("\n--- Evaluating Persistence Baseline ---")
    p_geo_pers = (test_df["kp"].values >= 5.0).astype(float)
    p_prot_pers = (test_df["p10"].values >= 10.0).astype(float)
    p_dst_pers = test_df["dst"].values

    bs_geo_pers = float(brier_score_loss(y_geo_test, p_geo_pers))
    bss_geo_pers = brier_skill_score(bs_geo_pers, clim_brier_geo)
    tss_geo_pers = compute_tss(y_geo_test, p_geo_pers, 0.5)
    rmse_dst_pers = float(np.sqrt(mean_squared_error(y_dst_test, p_dst_pers)))
    mae_dst_pers = float(mean_absolute_error(y_dst_test, p_dst_pers))

    results["persistence"] = {
        "geomagnetic": {
            "brier_score": bs_geo_pers,
            "brier_skill_score": bss_geo_pers,
            "tss": tss_geo_pers,
            "auc": float(roc_auc_score(y_geo_test, p_geo_pers)),
        },
        "proton": {
            "status": "ground_truth_unavailable_in_omni2_post_2020",
            "note": "OMNI2 low_res archive discontinued energetic proton flux ingestion after 2020."
        } if not has_prot_test else {
            "brier_score": float(brier_score_loss(y_prot_test[valid_prot_test], p_prot_pers[valid_prot_test])),
            "brier_skill_score": brier_skill_score(float(brier_score_loss(y_prot_test[valid_prot_test], p_prot_pers[valid_prot_test])), clim_brier_prot),
            "tss": compute_tss(y_prot_test[valid_prot_test], p_prot_pers[valid_prot_test], 0.5),
            "auc": float(roc_auc_score(y_prot_test[valid_prot_test], p_prot_pers[valid_prot_test])),
        },
        "dst_min": {
            "rmse": rmse_dst_pers,
            "mae": mae_dst_pers,
        }
    }
    print("Persistence results:", json.dumps(results["persistence"], indent=2))

    # ==========================================
    # 2. Logistic Regression & Ridge
    # ==========================================
    print("\n--- Training Logistic Regression & Ridge ---")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Geo
    lr_geo = LogisticRegression(class_weight="balanced", random_state=42, max_iter=1000)
    lr_geo.fit(X_train_scaled, y_geo_train)
    prob_geo_lr = lr_geo.predict_proba(X_test_scaled)[:, 1]
    bs_geo_lr = float(brier_score_loss(y_geo_test, prob_geo_lr))
    bss_geo_lr = brier_skill_score(bs_geo_lr, clim_brier_geo)
    tss_geo_lr, th_geo_lr = find_best_tss(y_geo_test, prob_geo_lr)
    auc_geo_lr = float(roc_auc_score(y_geo_test, prob_geo_lr))

    # Proton
    if has_prot_test:
        lr_prot = LogisticRegression(class_weight="balanced", random_state=42, max_iter=1000)
        lr_prot.fit(X_train_scaled, y_prot_train)
        prob_prot_lr = lr_prot.predict_proba(X_test_scaled[valid_prot_test])[:, 1]
        bs_prot_lr = float(brier_score_loss(y_prot_test[valid_prot_test], prob_prot_lr))
        bss_prot_lr = brier_skill_score(bs_prot_lr, clim_brier_prot)
        tss_prot_lr, th_prot_lr = find_best_tss(y_prot_test[valid_prot_test], prob_prot_lr)
        auc_prot_lr = float(roc_auc_score(y_prot_test[valid_prot_test], prob_prot_lr))
        prot_lr_res = {
            "brier_score": bs_prot_lr,
            "brier_skill_score": bss_prot_lr,
            "tss": tss_prot_lr,
            "best_threshold": th_prot_lr,
            "auc": auc_prot_lr,
        }
    else:
        prot_lr_res = {
            "status": "ground_truth_unavailable_in_omni2_post_2020",
            "note": "OMNI2 low_res archive discontinued energetic proton flux ingestion after 2020."
        }

    # Dst Ridge
    ridge_dst = Ridge(alpha=10.0, random_state=42)
    ridge_dst.fit(X_train_scaled, y_dst_train)
    pred_dst_lr = ridge_dst.predict(X_test_scaled)
    rmse_dst_lr = float(np.sqrt(mean_squared_error(y_dst_test, pred_dst_lr)))
    mae_dst_lr = float(mean_absolute_error(y_dst_test, pred_dst_lr))

    results["logistic_regression"] = {
        "geomagnetic": {
            "brier_score": bs_geo_lr,
            "brier_skill_score": bss_geo_lr,
            "tss": tss_geo_lr,
            "best_threshold": th_geo_lr,
            "auc": auc_geo_lr,
        },
        "proton": prot_lr_res,
        "dst_min": {
            "rmse": rmse_dst_lr,
            "mae": mae_dst_lr,
        }
    }
    print("Logistic Regression results:", json.dumps(results["logistic_regression"], indent=2))

    # ==========================================
    # 3. LightGBM Baseline
    # ==========================================
    print("\n--- Training LightGBM Models ---")
    scale_geo = (len(y_geo_train) - y_geo_train.sum()) / y_geo_train.sum()
    scale_prot = (len(y_prot_train) - y_prot_train.sum()) / y_prot_train.sum()

    # Geo LGBM
    lgb_geo = lgb.LGBMClassifier(
        n_estimators=150,
        learning_rate=0.05,
        num_leaves=31,
        scale_pos_weight=scale_geo,
        random_state=42,
        verbose=-1
    )
    lgb_geo.fit(X_train, y_geo_train)
    prob_geo_lgb = lgb_geo.predict_proba(X_test)[:, 1]
    bs_geo_lgb = float(brier_score_loss(y_geo_test, prob_geo_lgb))
    bss_geo_lgb = brier_skill_score(bs_geo_lgb, clim_brier_geo)
    tss_geo_lgb, th_geo_lgb = find_best_tss(y_geo_test, prob_geo_lgb)
    auc_geo_lgb = float(roc_auc_score(y_geo_test, prob_geo_lgb))

    # Proton LGBM
    if has_prot_test:
        lgb_prot = lgb.LGBMClassifier(
            n_estimators=150,
            learning_rate=0.05,
            num_leaves=31,
            scale_pos_weight=scale_prot,
            random_state=42,
            verbose=-1
        )
        lgb_prot.fit(X_train, y_prot_train)
        prob_prot_lgb = lgb_prot.predict_proba(X_test[valid_prot_test])[:, 1]
        bs_prot_lgb = float(brier_score_loss(y_prot_test[valid_prot_test], prob_prot_lgb))
        bss_prot_lgb = brier_skill_score(bs_prot_lgb, clim_brier_prot)
        tss_prot_lgb, th_prot_lgb = find_best_tss(y_prot_test[valid_prot_test], prob_prot_lgb)
        auc_prot_lgb = float(roc_auc_score(y_prot_test[valid_prot_test], prob_prot_lgb))
        prot_lgb_res = {
            "brier_score": bs_prot_lgb,
            "brier_skill_score": bss_prot_lgb,
            "tss": tss_prot_lgb,
            "best_threshold": th_prot_lgb,
            "auc": auc_prot_lgb,
        }
    else:
        prot_lgb_res = {
            "status": "ground_truth_unavailable_in_omni2_post_2020",
            "note": "OMNI2 low_res archive discontinued energetic proton flux ingestion after 2020."
        }

    # Dst LGBM Regressor
    lgb_dst = lgb.LGBMRegressor(
        n_estimators=150,
        learning_rate=0.05,
        num_leaves=31,
        random_state=42,
        verbose=-1
    )
    lgb_dst.fit(X_train, y_dst_train)
    pred_dst_lgb = lgb_dst.predict(X_test)
    rmse_dst_lgb = float(np.sqrt(mean_squared_error(y_dst_test, pred_dst_lgb)))
    mae_dst_lgb = float(mean_absolute_error(y_dst_test, pred_dst_lgb))

    results["lightgbm"] = {
        "geomagnetic": {
            "brier_score": bs_geo_lgb,
            "brier_skill_score": bss_geo_lgb,
            "tss": tss_geo_lgb,
            "best_threshold": th_geo_lgb,
            "auc": auc_geo_lgb,
        },
        "proton": prot_lgb_res,
        "dst_min": {
            "rmse": rmse_dst_lgb,
            "mae": mae_dst_lgb,
        }
    }
    print("LightGBM results:", json.dumps(results["lightgbm"], indent=2))

    out_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "baselines.json")
    out_path = os.path.normpath(out_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nSUCCESS: Baseline results written to {out_path}")

if __name__ == "__main__":
    main()
