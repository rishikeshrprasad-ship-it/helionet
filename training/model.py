#!/usr/bin/env python3
"""
Step 5: model.py
Implements the HelioNet deep learning model architectures:
1. HelioNetTransformer: Small Transformer encoder (d=64, 2 layers, 4 heads) on [24 x 15] windows,
   mean pooling, with task-specific heads:
   - geo_head: Kp >= 5 probability logit
   - proton_head: p10 >= 10 pfu probability logit
   - dst_head: min Dst regression target
   - flare_head: placeholder (null / untrained)
2. HelioNetNoAttention: Ablation architecture without self-attention (MLP projection + mean pooling).
"""
import torch
import torch.nn as nn
import math

class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int = 64, max_len: int = 24):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))  # [1, max_len, d_model]

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, :x.size(1), :]

class HelioNetTransformer(nn.Module):
    """
    Core space-weather Transformer forecaster.
    Input shape: [batch, 24, 15]
    """
    def __init__(
        self,
        num_features: int = 15,
        d_model: int = 64,
        n_heads: int = 4,
        n_layers: int = 2,
        d_ff: int = 128,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.num_features = num_features
        self.d_model = d_model

        # Linear projection of input features to d_model
        self.in_proj = nn.Linear(num_features, d_model)
        self.pos_encoder = PositionalEncoding(d_model=d_model, max_len=24)
        self.drop = nn.Dropout(dropout)

        # Transformer encoder layers
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_ff,
            dropout=dropout,
            batch_first=True,
            norm_first=True,
            activation="gelu"
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.layer_norm = nn.LayerNorm(d_model)

        # Task heads from 64-dimensional pooled representation
        self.geo_head = nn.Linear(d_model, 1)
        self.proton_head = nn.Linear(d_model, 1)
        self.dst_head = nn.Linear(d_model, 1)
        self.flare_head = nn.Linear(d_model, 1)  # Placeholder

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """
        Runs input window [batch, 24, 15] through the encoder and returns
        the pooled 64-dimensional latent embedding.
        """
        # x: [batch, 24, 15]
        h = self.in_proj(x)                 # [batch, 24, d_model]
        h = self.pos_encoder(h)
        h = self.drop(h)
        h = self.transformer(h)             # [batch, 24, d_model]
        h = self.layer_norm(h)
        pooled = h.mean(dim=1)              # Mean pooling -> [batch, 64]
        return pooled

    def forward(self, x: torch.Tensor):
        pooled = self.extract_features(x)
        logit_geo = self.geo_head(pooled).squeeze(-1)
        logit_proton = self.proton_head(pooled).squeeze(-1)
        pred_dst = self.dst_head(pooled).squeeze(-1)
        logit_flare = self.flare_head(pooled).squeeze(-1)
        return logit_geo, logit_proton, pred_dst, logit_flare, pooled


class HelioNetNoAttention(nn.Module):
    """
    Ablation model replacing self-attention with a feed-forward MLP.
    """
    def __init__(self, num_features: int = 15, d_model: int = 64, d_ff: int = 128, dropout: float = 0.1):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(num_features, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.LayerNorm(d_model),
        )
        self.geo_head = nn.Linear(d_model, 1)
        self.proton_head = nn.Linear(d_model, 1)
        self.dst_head = nn.Linear(d_model, 1)
        self.flare_head = nn.Linear(d_model, 1)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        h = self.mlp(x)                     # [batch, 24, d_model]
        pooled = h.mean(dim=1)              # [batch, 64]
        return pooled

    def forward(self, x: torch.Tensor):
        pooled = self.extract_features(x)
        logit_geo = self.geo_head(pooled).squeeze(-1)
        logit_proton = self.proton_head(pooled).squeeze(-1)
        pred_dst = self.dst_head(pooled).squeeze(-1)
        logit_flare = self.flare_head(pooled).squeeze(-1)
        return logit_geo, logit_proton, pred_dst, logit_flare, pooled


class HelioNetONNXExport(nn.Module):
    """
    Inference wrapper for ONNX export matching exact DATA_CONTRACTS:
    input tensor:  [batch, 24, 15]
    output tensor: [batch, 3] corresponding to [pGeo, pProton, pFlare]
    """
    def __init__(self, model: HelioNetTransformer, temp_geo: float = 1.0, temp_proton: float = 1.0):
        super().__init__()
        self.model = model
        self.temp_geo = temp_geo
        self.temp_proton = temp_proton

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logit_geo, logit_proton, _, _, _ = self.model(x)
        p_geo = torch.sigmoid(logit_geo / self.temp_geo).unsqueeze(-1)
        p_proton = torch.sigmoid(logit_proton / self.temp_proton).unsqueeze(-1)
        # Flare head is null / untrained (-1.0 flag for downstream worker)
        p_flare = torch.full_like(p_geo, -1.0)
        return torch.cat([p_geo, p_proton, p_flare], dim=-1)
