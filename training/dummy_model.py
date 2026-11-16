import os
import json
import torch
import torch.nn as nn

torch.manual_seed(42)

class DummyHelioNet(nn.Module):
    """
    Tiny baseline model for HelioNet space weather forecast validation.
    Takes 24 hours of 15-channel solar wind/IMF observations [1, 24, 15]
    and outputs 3 calibrated storm probabilities (Geo, Proton, Flare) via Sigmoid.
    """
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(24 * 15, 3)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x is expected to have shape [1, 24, 15] or [batch, 24, 15]
        flat = x.view(x.size(0), -1)
        return self.sigmoid(self.fc(flat))

def main():
    model = DummyHelioNet()
    model.eval()

    dummy_input = torch.randn(1, 24, 15, dtype=torch.float32)

    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'models')
    os.makedirs(output_dir, exist_ok=True)

    onnx_path = os.path.join(output_dir, 'helionet.onnx')
    model_card_path = os.path.join(output_dir, 'model_card.json')

    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}},
        opset_version=14,
        dynamo=False,
    )
    print(f'Saved dummy ONNX model to: {onnx_path} ({os.path.getsize(onnx_path)} bytes)')

    # Write model card with illustrative: true
    model_card = {
        "illustrative": True,
        "name": "HelioNet-Dummy-ONNX",
        "version": "0.1.0",
        "description": "Dummy baseline space weather forecasting model with fixed random weights.",
        "input_shape": [1, 24, 15],
        "output_shape": [1, 3],
        "outputs": ["pGeo", "pProton", "pFlare"],
        "architecture": "Linear(360, 3) + Sigmoid"
    }

    with open(model_card_path, 'w', encoding='utf-8') as f:
        json.dump(model_card, f, indent=2)
    print(f'Saved model card to: {model_card_path}')

if __name__ == '__main__':
    main()
