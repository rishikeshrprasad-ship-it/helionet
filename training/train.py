#!/usr/bin/env python3
"""
Step 5: train.py
Trains the HelioNet Transformer model on 24x15 hourly observation windows.
Features:
- Weighted BCE loss for rare storm events (geomagnetic and proton)
- Smooth L1 regression loss for 24h minimum Dst
- Config-driven Burton physics penalty
- Early stopping on validation loss
- Saves best model weights to training/results/best_model.pt
- Also trains HelioNetNoAttention for ablation in Step 7.
"""
import os
import sys
import yaml
import json
import random
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from numpy.lib.stride_tricks import sliding_window_view

from model import HelioNetTransformer, HelioNetNoAttention

FEATURE_COLS = [
    "b_mag", "bz_gsm", "vsw", "density", "temperature",
    "flow_pressure", "kp", "dst", "f107", "sunspot", "p10",
    "b_mag_max24", "vsw_max24", "flow_pressure_max24", "p10_max24"
]

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

class SpaceWeatherWindowDataset(Dataset):
    """
    Constructs [24 x 15] sliding windows from continuous hourly records.
    """
    def __init__(self, features: np.ndarray, labels_geo: np.ndarray, labels_prot: np.ndarray, targets_dst: np.ndarray, window_size: int = 24):
        assert len(features) >= window_size, "Features length shorter than window size"
        # sliding_window_view: [N - 23, 1, 24, 15] -> [N - 23, 24, 15]
        self.windows = sliding_window_view(features, (window_size, features.shape[1])).squeeze(1).copy()
        # Labels corresponding to the end of each window
        self.y_geo = labels_geo[window_size - 1:].copy()
        self.y_prot = labels_prot[window_size - 1:].copy()
        self.y_dst = targets_dst[window_size - 1:].copy()

        assert len(self.windows) == len(self.y_geo)

    def __len__(self):
        return len(self.windows)

    def __getitem__(self, idx):
        return (
            torch.tensor(self.windows[idx], dtype=torch.float32),
            torch.tensor(self.y_geo[idx], dtype=torch.float32),
            torch.tensor(self.y_prot[idx], dtype=torch.float32),
            torch.tensor(self.y_dst[idx], dtype=torch.float32),
        )

def compute_burton_target(window_raw: torch.Tensor, decay_hours: float, coupling_coeff: float) -> torch.Tensor:
    """
    Vectorized calculation of the Burton-McPherron-Russell (1975) Dst expectation.
    window_raw: [batch, 24, 15]
    Feature indices: bz_gsm=1, vsw=2, dst=7
    """
    bz = window_raw[:, :, 1]          # [batch, 24]
    vsw = window_raw[:, :, 2]         # [batch, 24]
    dst_initial = window_raw[:, -1, 7] # Current Dst at window end

    # Interplanetary electric field Ey (mV/m) = vsw (km/s) * max(0, -Bz) * 1e-3
    southward_bz = torch.clamp(-bz, min=0.0)
    ey = vsw * southward_bz * 1e-3
    q = -coupling_coeff * ey           # Energy injection (nT/h)

    # Integrated approximate minimum Dst under Burton dynamics
    decay_rate = 1.0 / max(1.0, decay_hours)
    # Estimate minimum achievable Dst given current Dst and recent 24h peak injection
    q_mean = q.mean(dim=1)
    estimated_dst = dst_initial + (q_mean / decay_rate) * (1.0 - torch.exp(torch.tensor(-24.0 * decay_rate)))
    return estimated_dst

def train_epoch(model, dataloader, optimizer, pos_weight_geo, pos_weight_prot, dst_weight, physics_cfg, device):
    model.train()
    total_loss = 0.0

    bce_geo = nn.BCEWithLogitsLoss(pos_weight=pos_weight_geo.to(device))
    bce_prot = nn.BCEWithLogitsLoss(pos_weight=pos_weight_prot.to(device))
    l1_dst = nn.SmoothL1Loss()

    use_physics = physics_cfg.get("enabled", False)
    phys_weight = physics_cfg.get("weight", 0.02)
    decay_h = physics_cfg.get("decay_time_hours", 7.7)
    coup_c = physics_cfg.get("coupling_coefficient", 4.0)

    for x_win, y_geo, y_prot, y_dst in dataloader:
        x_win = x_win.to(device)
        y_geo = y_geo.to(device)
        y_prot = y_prot.to(device)
        y_dst = y_dst.to(device)

        optimizer.zero_grad()
        logit_geo, logit_prot, pred_dst, _, _ = model(x_win)

        valid_geo = ~torch.isnan(y_geo)
        l_geo = bce_geo(logit_geo[valid_geo], y_geo[valid_geo]) if valid_geo.any() else torch.tensor(0.0, device=device)

        valid_prot = ~torch.isnan(y_prot)
        l_prot = bce_prot(logit_prot[valid_prot], y_prot[valid_prot]) if valid_prot.any() else torch.tensor(0.0, device=device)

        valid_dst = ~torch.isnan(y_dst)
        l_dst = (l1_dst(pred_dst[valid_dst], y_dst[valid_dst]) * dst_weight) if valid_dst.any() else torch.tensor(0.0, device=device)

        loss = l_geo + l_prot + l_dst

        if use_physics:
            # Physical penalty against unphysical Dst under strong southward IMF
            with torch.no_grad():
                burton_target = compute_burton_target(x_win, decay_h, coup_c)
            # Penalize predicting positive / calm Dst when Burton predicts major storm
            phys_dev = torch.clamp(pred_dst - burton_target, min=0.0)
            loss_phys = phys_weight * torch.mean(phys_dev ** 2) * 0.001
            loss = loss + loss_phys

        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
        optimizer.step()

        total_loss += loss.item() * len(x_win)

    return total_loss / len(dataloader.dataset)

def eval_epoch(model, dataloader, pos_weight_geo, pos_weight_prot, dst_weight, device):
    model.eval()
    total_loss = 0.0

    bce_geo = nn.BCEWithLogitsLoss(pos_weight=pos_weight_geo.to(device))
    bce_prot = nn.BCEWithLogitsLoss(pos_weight=pos_weight_prot.to(device))
    l1_dst = nn.SmoothL1Loss()

    with torch.no_grad():
        for x_win, y_geo, y_prot, y_dst in dataloader:
            x_win = x_win.to(device)
            y_geo = y_geo.to(device)
            y_prot = y_prot.to(device)
            y_dst = y_dst.to(device)

            logit_geo, logit_prot, pred_dst, _, _ = model(x_win)
            valid_geo = ~torch.isnan(y_geo)
            l_geo = bce_geo(logit_geo[valid_geo], y_geo[valid_geo]) if valid_geo.any() else torch.tensor(0.0, device=device)

            valid_prot = ~torch.isnan(y_prot)
            l_prot = bce_prot(logit_prot[valid_prot], y_prot[valid_prot]) if valid_prot.any() else torch.tensor(0.0, device=device)

            valid_dst = ~torch.isnan(y_dst)
            l_dst = (l1_dst(pred_dst[valid_dst], y_dst[valid_dst]) * dst_weight) if valid_dst.any() else torch.tensor(0.0, device=device)

            loss = l_geo + l_prot + l_dst
            total_loss += loss.item() * len(x_win)

    return total_loss / len(dataloader.dataset)

def main():
    cfg = load_config()
    set_seed(cfg.get("seed", 42))

    device = torch.device("cpu")
    print(f"Training device: {device}")

    data_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["splits_dir"])
    data_dir = os.path.normpath(data_dir)

    train_path = os.path.join(data_dir, "train.parquet")
    val_path = os.path.join(data_dir, "val.parquet")
    test_path = os.path.join(data_dir, "test.parquet")

    for p in [train_path, val_path, test_path]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"FATAL: Missing split file {p}. Run split.py first.")

    train_df = pd.read_parquet(train_path)
    val_df = pd.read_parquet(val_path)
    test_df = pd.read_parquet(test_path)

    # Compute normalization parameters strictly on train set
    train_raw = train_df[FEATURE_COLS].values
    val_raw = val_df[FEATURE_COLS].values
    test_raw = test_df[FEATURE_COLS].values

    mean_vec = np.nanmean(train_raw, axis=0)
    std_vec = np.nanstd(train_raw, axis=0)
    std_vec[std_vec < 1e-4] = 1.0

    scaler_dict = {
        "mean": mean_vec.tolist(),
        "std": std_vec.tolist(),
        "features": FEATURE_COLS
    }
    scaler_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "scaler_params.json")
    scaler_path = os.path.normpath(scaler_path)
    os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
    with open(scaler_path, "w", encoding="utf-8") as f:
        json.dump(scaler_dict, f, indent=2)

    # Standardize inputs
    train_norm = (train_raw - mean_vec) / std_vec
    val_norm = (val_raw - mean_vec) / std_vec
    test_norm = (test_raw - mean_vec) / std_vec

    # Datasets and Loaders
    batch_size = cfg["training"]["batch_size"]
    train_ds = SpaceWeatherWindowDataset(train_norm, train_df["label_geo"].values, train_df["label_proton"].values, train_df["target_dst_min"].values)
    val_ds = SpaceWeatherWindowDataset(val_norm, val_df["label_geo"].values, val_df["label_proton"].values, val_df["target_dst_min"].values)
    test_ds = SpaceWeatherWindowDataset(test_norm, test_df["label_geo"].values, test_df["label_proton"].values, test_df["target_dst_min"].values)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    print(f"Windows created: Train={len(train_ds)}, Val={len(val_ds)}, Test={len(test_ds)}")

    # Class weighting for rare events
    n_pos_geo = (train_df["label_geo"] == 1).sum()
    n_neg_geo = len(train_df) - n_pos_geo
    pos_weight_geo = torch.tensor([float(n_neg_geo / max(1, n_pos_geo))])

    n_pos_prot = (train_df["label_proton"] == 1).sum()
    n_neg_prot = len(train_df) - n_pos_prot
    pos_weight_prot = torch.tensor([float(n_neg_prot / max(1, n_pos_prot))])

    print(f"BCE Pos Weights: Geo={pos_weight_geo.item():.2f}, Proton={pos_weight_prot.item():.2f}")

    # Initialize Transformer model
    m_cfg = cfg["model"]
    model = HelioNetTransformer(
        num_features=m_cfg["num_features"],
        d_model=m_cfg["d_model"],
        n_heads=m_cfg["n_heads"],
        n_layers=m_cfg["n_layers"],
        d_ff=m_cfg["d_ff"],
        dropout=m_cfg["dropout"],
    ).to(device)

    optimizer = optim.AdamW(
        model.parameters(),
        lr=cfg["training"]["learning_rate"],
        weight_decay=cfg["training"]["weight_decay"]
    )

    max_epochs = cfg["training"]["max_epochs"]
    patience = cfg["training"]["patience"]
    dst_weight = cfg["training"]["dst_loss_weight"]
    physics_cfg = cfg.get("physics_penalty", {})

    print(f"\n--- Training HelioNet Transformer ({max_epochs} epochs max, patience={patience}) ---")
    best_val_loss = float("inf")
    patience_counter = 0
    best_weights_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "best_model.pt")
    best_weights_path = os.path.normpath(best_weights_path)

    for epoch in range(1, max_epochs + 1):
        tr_loss = train_epoch(model, train_loader, optimizer, pos_weight_geo, pos_weight_prot, dst_weight, physics_cfg, device)
        val_loss = eval_epoch(model, val_loader, pos_weight_geo, pos_weight_prot, dst_weight, device)

        print(f"Epoch {epoch:02d}/{max_epochs:02d} | Train Loss: {tr_loss:.4f} | Val Loss: {val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            torch.save(model.state_dict(), best_weights_path)
            print(f"  --> Saved new best model (Val Loss: {best_val_loss:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"Early stopping triggered after {epoch} epochs.")
                break

    # Load best weights
    model.load_state_dict(torch.load(best_weights_path))
    print(f"Successfully trained HelioNet Transformer. Best weights: {best_weights_path}")

    # Also train Ablation Model (No Attention)
    print("\n--- Training Ablation Model: HelioNetNoAttention ---")
    ablation_model = HelioNetNoAttention(
        num_features=m_cfg["num_features"],
        d_model=m_cfg["d_model"],
        d_ff=m_cfg["d_ff"],
        dropout=m_cfg["dropout"]
    ).to(device)
    abl_optim = optim.AdamW(ablation_model.parameters(), lr=cfg["training"]["learning_rate"], weight_decay=cfg["training"]["weight_decay"])

    best_abl_val = float("inf")
    abl_weights_path = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"], "ablation_no_attention.pt")
    abl_weights_path = os.path.normpath(abl_weights_path)

    for epoch in range(1, 15):
        train_epoch(ablation_model, train_loader, abl_optim, pos_weight_geo, pos_weight_prot, dst_weight, {}, device)
        v_loss = eval_epoch(ablation_model, val_loader, pos_weight_geo, pos_weight_prot, dst_weight, device)
        if v_loss < best_abl_val:
            best_abl_val = v_loss
            torch.save(ablation_model.state_dict(), abl_weights_path)

    print(f"Ablation model trained and saved to {abl_weights_path}")

if __name__ == "__main__":
    main()
