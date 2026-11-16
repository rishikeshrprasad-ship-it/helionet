#!/usr/bin/env python3
"""
docs/report/scripts/generate_model_fig.py
Generates fig22_model_metrics_reliability.png comparing all models on test set (2022-2025).
"""
import os
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
    metrics_path = os.path.join(root, "training", "results", "metrics.json")
    figures_dir = os.path.join(root, "docs", "report", "figures")
    os.makedirs(figures_dir, exist_ok=True)

    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    models = metrics["models"]
    m_names = ["persistence", "logistic_regression", "lightgbm", "helionet_transformer"]
    m_labels = ["Persistence", "Logistic Reg / Ridge", "LightGBM", "HelioNet Transformer"]

    geo_tss = [models[m]["geomagnetic"]["tss"] for m in m_names]
    geo_auc = [models[m]["geomagnetic"]["auc"] for m in m_names]
    dst_rmse = [models[m]["dst_min"]["rmse"] for m in m_names]

    fig, axes = plt.subplots(1, 3, figsize=(13.5, 4.5), dpi=150)

    # 1. TSS Comparison
    ax1 = axes[0]
    bars1 = ax1.bar(m_labels, geo_tss, color=["#8B8F98", "#7BAE7F", "#7FA6C9", "#F2A33A"], edgecolor="#2A2D34", width=0.55)
    ax1.set_title("Geomagnetic Storm (Kp >= 5) TSS", fontsize=11, fontweight="bold")
    ax1.set_ylabel("True Skill Statistic (TSS)", fontsize=10)
    ax1.set_ylim(0, 0.6)
    ax1.grid(axis="y", linestyle="--", alpha=0.3)
    for b, v in zip(bars1, geo_tss):
        ax1.text(b.get_x() + b.get_width()/2, v + 0.015, f"{v:.3f}", ha="center", fontsize=9, fontweight="bold")
    ax1.set_xticklabels(m_labels, rotation=25, ha="right", fontsize=9)

    # 2. AUC Comparison
    ax2 = axes[1]
    bars2 = ax2.bar(m_labels, geo_auc, color=["#8B8F98", "#7BAE7F", "#7FA6C9", "#F2A33A"], edgecolor="#2A2D34", width=0.55)
    ax2.set_title("Geomagnetic Storm ROC-AUC", fontsize=11, fontweight="bold")
    ax2.set_ylabel("ROC-AUC Score", fontsize=10)
    ax2.set_ylim(0.5, 0.9)
    ax2.grid(axis="y", linestyle="--", alpha=0.3)
    for b, v in zip(bars2, geo_auc):
        ax2.text(b.get_x() + b.get_width()/2, v + 0.01, f"{v:.3f}", ha="center", fontsize=9, fontweight="bold")
    ax2.set_xticklabels(m_labels, rotation=25, ha="right", fontsize=9)

    # 3. Dst Min RMSE (lower is better)
    ax3 = axes[2]
    bars3 = ax3.bar(m_labels, dst_rmse, color=["#8B8F98", "#7BAE7F", "#7BAE7F", "#F2A33A"], edgecolor="#2A2D34", width=0.55)
    bars3[2].set_color("#7BAE7F") # LightGBM winner
    ax3.set_title("Minimum Dst Regression RMSE (Lower is Better)", fontsize=11, fontweight="bold")
    ax3.set_ylabel("RMSE (nT)", fontsize=10)
    ax3.set_ylim(0, 35)
    ax3.grid(axis="y", linestyle="--", alpha=0.3)
    for b, v in zip(bars3, dst_rmse):
        ax3.text(b.get_x() + b.get_width()/2, v + 0.8, f"{v:.2f} nT", ha="center", fontsize=9, fontweight="bold")
    ax3.set_xticklabels(m_labels, rotation=25, ha="right", fontsize=9)

    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig22_model_metrics_reliability.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"SUCCESS: Saved {out_path}")

if __name__ == "__main__":
    main()
