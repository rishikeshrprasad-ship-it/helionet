#!/usr/bin/env python3
"""
Step 8: export_onnx.py
Exports the trained HelioNet Transformer to public/models/helionet.onnx.
- Input tensor: [batch, 24, 15]
- Output tensor: [batch, 3] with [pGeo, pProton, pFlare]
- Bakes in input standardization (mean/std) and temperature scaling
- Verifies ONNX numerical accuracy against PyTorch on 100 test windows (tolerance 1e-4)
- Writes public/models/model_card.json with illustrative: false, training period,
  test metrics, and explicit notice that flare head is not trained.
"""
import os
import sys
import yaml
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import onnx
import onnxruntime as ort

from model import HelioNetTransformer
from train import SpaceWeatherWindowDataset, FEATURE_COLS

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

class FullExportPipeline(nn.Module):
    """
    Complete self-contained pipeline for ONNX deployment:
    1. Standardizes raw input features with frozen training mean and std
    2. Runs Transformer encoder
    3. Computes temperature-calibrated sigmoid probabilities
    Output: [batch, 3] matching [pGeo, pProton, pFlare]
    """
    def __init__(self, core_model: HelioNetTransformer, mean_vec: np.ndarray, std_vec: np.ndarray, temp_geo: float, temp_prot: float):
        super().__init__()
        self.core = core_model
        # Register buffers so they are exported as ONNX constants
        self.register_buffer("mean", torch.tensor(mean_vec, dtype=torch.float32).view(1, 1, 15))
        self.register_buffer("std", torch.tensor(std_vec, dtype=torch.float32).view(1, 1, 15))
        self.temp_geo = float(temp_geo)
        self.temp_prot = float(temp_prot)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Standardize raw inputs: [batch, 24, 15]
        x_norm = (x - self.mean) / self.std

        logit_geo, logit_prot, _, _, _ = self.core(x_norm)
        p_geo = torch.sigmoid(logit_geo / self.temp_geo).unsqueeze(-1)
        p_prot = torch.sigmoid(logit_prot / self.temp_prot).unsqueeze(-1)

        # Flare head: untrained in OMNI2 -> return -1.0 flag
        p_flare = torch.full_like(p_geo, -1.0)

        # Shape: [batch, 3]
        return torch.cat([p_geo, p_prot, p_flare], dim=-1)

def main():
    cfg = load_config()
    results_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["results_dir"])
    results_dir = os.path.normpath(results_dir)
    models_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["models_dir"])
    models_dir = os.path.normpath(models_dir)
    data_dir = os.path.join(os.path.dirname(__file__), "..", cfg["paths"]["splits_dir"])
    data_dir = os.path.normpath(data_dir)

    scaler_path = os.path.join(results_dir, "scaler_params.json")
    with open(scaler_path, "r", encoding="utf-8") as f:
        scaler = json.load(f)
    mean_vec = np.array(scaler["mean"], dtype=np.float32)
    std_vec = np.array(scaler["std"], dtype=np.float32)

    temps_path = os.path.join(results_dir, "calibration_temps.json")
    with open(temps_path, "r", encoding="utf-8") as f:
        temps = json.load(f)
    t_geo = temps.get("temp_geo", 1.0)
    t_prot = temps.get("temp_proton", 1.0)

    # Instantiate core Transformer and load weights
    m_cfg = cfg["model"]
    core = HelioNetTransformer(
        num_features=m_cfg["num_features"],
        d_model=m_cfg["d_model"],
        n_heads=m_cfg["n_heads"],
        n_layers=m_cfg["n_layers"],
        d_ff=m_cfg["d_ff"],
        dropout=0.0
    )
    weights_path = os.path.join(results_dir, "best_model.pt")
    core.load_state_dict(torch.load(weights_path))
    core.eval()

    export_model = FullExportPipeline(core, mean_vec, std_vec, t_geo, t_prot)
    export_model.eval()

    onnx_path = os.path.join(models_dir, "helionet.onnx")
    dummy_input = torch.randn(1, 24, 15, dtype=torch.float32)

    print(f"Exporting PyTorch model to ONNX: {onnx_path}...")
    torch.onnx.export(
        export_model,
        dummy_input,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch"},
            "output": {0: "batch"}
        },
        opset_version=14,
        dynamo=False
    )
    print(f"Exported ONNX file size: {os.path.getsize(onnx_path)} bytes")

    # Validate ONNX graph integrity
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX model checker: PASSED successfully.")

    # Numerical verification on 100 test windows (tolerance 1e-4)
    print("\nVerifying numerical equivalence against PyTorch on 100 test windows...")
    test_df = pd.read_parquet(os.path.join(data_dir, "test.parquet"))
    test_raw = test_df[FEATURE_COLS].values
    test_ds = SpaceWeatherWindowDataset(test_raw, test_df["label_geo"].values, test_df["label_proton"].values, test_df["target_dst_min"].values)

    num_eval = min(100, len(test_ds))
    sample_indices = np.linspace(0, len(test_ds) - 1, num_eval, dtype=int)
    test_samples = np.stack([test_ds.windows[i] for i in sample_indices], axis=0).astype(np.float32) # [100, 24, 15]

    # PyTorch output
    with torch.no_grad():
        torch_out = export_model(torch.tensor(test_samples)).numpy()

    # ONNX Runtime output
    ort_session = ort.InferenceSession(onnx_path)
    ort_out = ort_session.run(["output"], {"input": test_samples})[0]

    max_diff = float(np.abs(torch_out - ort_out).max())
    print(f"Maximum absolute difference (PyTorch vs ONNX Runtime): {max_diff:.3e}")

    tolerance = 1e-4
    assert max_diff < tolerance, f"FATAL: Max difference {max_diff:.3e} exceeds tolerance {tolerance}!"
    print(f"Verification PASSED: ONNX output matches PyTorch within {tolerance}.")

    # Load metrics for model card
    metrics_path = os.path.join(results_dir, "metrics.json")
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    # Write public/models/model_card.json matching DATA_CONTRACTS.md
    model_card = {
        "schemaVersion": "1.0.0",
        "illustrative": False,
        "name": "HelioNet-Transformer-OMNI2",
        "version": "1.0.0",
        "description": "Trained 2-layer Transformer space weather forecasting model on NASA OMNI2 hourly archive.",
        "training_period": f"{cfg['splits']['train_years'][0]}-{cfg['splits']['train_years'][1]}",
        "validation_period": f"{cfg['splits']['val_years'][0]}-{cfg['splits']['val_years'][1]}",
        "test_period": f"{cfg['splits']['test_years'][0]}-{cfg['splits']['test_years'][1]}",
        "flare_trained": False,
        "notes": "The flare head has no training data in the NASA OMNI2 hourly archive and is not trained (marked as Not available).",
        "input_shape": [1, 24, 15],
        "output_shape": [1, 3],
        "outputs": ["pGeo", "pProton", "pFlare"],
        "architecture": "TransformerEncoder(d=64, 2 layers, 4 heads) + MeanPooling + TaskHeads",
        "test_metrics": metrics.get("models", {}).get("helionet_transformer", {}),
        "comparison_summary": metrics.get("honest_comparison_summary", {})
    }

    card_path = os.path.join(models_dir, "model_card.json")
    with open(card_path, "w", encoding="utf-8") as f:
        json.dump(model_card, f, indent=2)

    print(f"SUCCESS: Model card written to {card_path}")

if __name__ == "__main__":
    main()
