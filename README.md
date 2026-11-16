# 🛰️ HelioNet

> **Autonomous space-weather mission control digital twin applying Discrete Mathematics (M1–M5) to LEO satellite constellation resilience and lunar surface rover evacuation. Features client-side ONNX forecasting trained on 28 years of NASA data, thermospheric drag mitigation, risk-adjusted Dijkstra mesh rerouting, and 3D WebGL real-time simulation.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black.svg)](https://threejs.org/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-Web-005CED.svg)](https://onnxruntime.ai/)
[![Tests](https://img.shields.io/badge/Vitest-38%20passed%20%7C%20155%20tests-brightgreen.svg)]()

---

## 🌌 Overview

Solar eruptive events—principally coronal mass ejections (CMEs) and solar energetic particle (SEP) storms—introduce severe operational hazards to space infrastructure:
1. **Thermospheric Neutral Density Expansion**: Extreme ultraviolet and auroral particle precipitation heat Earth's upper atmosphere, increasing neutral density at Low Earth Orbit (LEO, $300\text{--}600\text{ km}$) by up to an order of magnitude. This surge in aerodynamic drag causes satellite orbital decay or de-orbit (e.g. the February 2022 Starlink disaster where 38 satellites were lost).
2. **Dielectric Charging & SEUs**: Energetic particles induce electrostatic discharge and single-event upsets across satellite electronics, dropping inter-satellite cross-links.
3. **Lunar Biological Exposure**: On the unshielded lunar surface, coronal mass ejections deliver lethal solar proton fluxes ($>10\text{ MeV}$). Rovers and astronauts must reach subterranean shelter before exposure limits are breached.

**HelioNet** bridges continuous solar-terrestrial physics and discrete operational decision-making using the foundational principles of **Discrete Mathematics**.

---

## 📐 Discrete Mathematics Foundations (Modules 1–5)

The platform is architected around five discrete mathematical modules (detailed with worked calculations in [`docs/report/REPORT.md`](docs/report/REPORT.md)):

| Module | Mathematical Topic | Space Operations Application | Implementation File |
| :--- | :--- | :--- | :--- |
| **M1: Inclusion-Exclusion** | Principle of Inclusion-Exclusion (PIE) | Exact union failure probability ($P(\bigcup A_i) = 16.10\%$ vs naive $17.00\%$) across drag, charging, and SEU modes | `src/engines/failureProb.ts` |
| **M1: Permutations** | Derangements ($D_5 = 44$) | Sensor target cross-assignment under localized telemetry blindness ($D_n / n! \to 1/e$) | `src/engines/derangement.ts` |
| **M1: Forbidden Positions**| Rook Polynomials ($R(x, B)$) | Allocating rovers to emergency shelters avoiding impassable crevasse pairs | `src/engines/rook.ts` |
| **M2: Mathematical Logic** | Conjunction & FSM Invariants | Space-weather alert progression ($\text{WATCH} \iff P \land Q$) without contradictory states | `src/engines/rules.ts` |
| **M2: Rules of Inference** | Modus Tollens Invariant | Safety-critical execution: $\text{Maneuver} \implies \text{Confirmed} \land \neg\text{Confirmed} \implies \neg\text{Maneuver}$ | `src/engines/confirmFSM.ts` |
| **M3: Generating Functions**| Probability Generating Functions (PGF)| $G(s) = \prod (q_i + p_i s)$ for exact distributions and factorial moments of concurrent satellite dropouts | `src/engines/pgf.ts` |
| **M3: Recurrences** | First-Order Linear/Nonlinear Recurrences | Orbital altitude decay ($h_{t+1} = h_t - \Delta h$) and cumulative lunar radiation dose ($D_{t+1} = D_t + \dot{D}(1-\eta)\Delta t$) | `src/engines/orbitDecay.ts`, `src/engines/dose.ts` |
| **M4: Graph Theory** | Handshaking Lemma & Degree Invariants| Intersatellite laser cross-link topology verification ($\sum \deg(v) = 2|E|$) | `src/engines/network.ts` |
| **M4: Graph Colouring** | Vertex Colouring & Chromatic Number | Minimum interference frequency channel allocation ($\chi(G) = 2$) | `src/engines/colouring.ts` |
| **M5: Spanning Trees** | Kruskal's & Prim's Algorithms | Identical minimal broadcast latency tree construction ($W = 19.00$) | `src/engines/network.ts` |
| **M5: Shortest Path** | Risk-Adjusted Dijkstra Routing | Dynamic packet routing penalized exponentially by charging/drag failure risk | `src/engines/routing.ts` |
| **M5: Information Theory** | Optimal Prefix Huffman Coding | Telemetry alert compression ($L = 1.70\text{ bits/sym}$ approaching $H = 1.659\text{ bits}$) | `src/engines/huffman.ts` |
| **M5: Multi-Objective** | Bi-Criterion Pareto Optimization | Non-dominated frontier filtering for rover traverse time vs. cumulative radiation dose | `src/engines/shelterRouting.ts` |

---

## 🤖 Space-Weather Machine Learning Pipeline

HelioNet includes a complete offline training and evaluation pipeline in `training/` operating on **28 years of NASA OMNI2 hourly data (1998–2025, 244,788 hourly records)**:

- **Architecture**: 2-layer Transformer encoder ($d=64$, 4 attention heads, mean-pooling) with weighted BCE, smooth L1 loss, and Burton physics regularization.
- **Strict Chronological Splits**:
  - Train: 1998–2018 ($183,916$ rows)
  - Validation: 2020–2021 ($26,085$ rows)
  - Test: 2023–2025 ($34,704$ sliding windows, isolated by a $25.0\text{-hour}$ temporal buffer)
- **Honest Baseline Benchmarks**:
  - **Geomagnetic Storm ($Kp \ge 5$) TSS**: **Logistic Regression wins** ($\text{TSS} = \mathbf{0.4889}$, $\text{AUC} = 0.8017$) over Transformer ($\text{TSS} = 0.4741$, $\text{AUC} = 0.8026$).
  - **Minimum $Dst$ Regression**: **LightGBM wins** ($\text{RMSE} = \mathbf{21.64\text{ nT}}$, $\text{MAE} = \mathbf{12.03\text{ nT}}$) over Transformer ($\text{RMSE} = 24.25\text{ nT}$, $\text{MAE} = 12.11\text{ nT}$).
  - *Solar Flare Head*: Untrained and set to `null` to prevent synthetic data fabrication (OMNI2 lacks X-ray data).
- **Probability Calibration & Export**:
  - Platt temperature scaling ($T_{\text{geo}} = 0.6358$) trained on validation set.
  - Exported to `public/models/helionet.onnx` ($351,939\text{ bytes}$) with verified PyTorch numerical parity ($<4.8 \times 10^{-7}$ max absolute difference).

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://python.org/) 3.10+ (for optional offline ML pipeline re-training)

### 1. Installation
```bash
git clone https://github.com/rishikeshrprasad-ship-it/helionet.git
cd helionet
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Run Full Verification Suite (Tests, Lint, Bundle Budget)
```bash
npm run verify
```
*Executes TypeScript typechecking, runs 38 Vitest suites (155 unit tests), and verifies production bundle budget.*

---

## 🔁 Reproducing the AI Pipeline & Report Artifacts

```bash
# 1. Feature extraction from raw OMNI2 hourly files
python training/build_features.py

# 2. Forward-looking label generation (24h horizon)
python training/build_labels.py

# 3. Train/validation/test chronological partition
python training/split.py

# 4. Train baselines (Persistence, Logistic Regression, LightGBM)
python training/baselines.py

# 5. Train Transformer neural network
python training/train.py

# 6. Temperature scaling probability calibration
python training/calibrate.py

# 7. Evaluate on independent test set
python training/evaluate.py

# 8. Export to ONNX and verify numerical parity
python training/export_onnx.py

# 9. Compute discrete math worked examples & generate report charts
python docs/report/scripts/compute_math_examples.py
python docs/report/scripts/generate_charts.py
python docs/report/scripts/generate_model_fig.py
```

---

## 📁 Repository Structure

```text
├── docs/
│   ├── report/
│   │   ├── REPORT.md                  # Comprehensive Discrete Mathematics Project Report
│   │   ├── REPORT_FACT_CHECK.md       # Provenance table linking all numbers & claims
│   │   ├── REPORT_FIGURES.md          # Complete catalog of all 22 figures & captures
│   │   ├── figures/                   # Rendered figures & responsive UI screenshots
│   │   └── scripts/                   # Reproducible math calculation & chart scripts
│   ├── DATA_CONTRACTS.md              # JSON & parquet schemas
│   └── SYLLABUS.md                    # Discrete Mathematics Modules 1-5 mapping
├── public/
│   ├── models/
│   │   ├── helionet.onnx              # Production quantized ONNX model
│   │   ├── calibration.json           # Temperature scaling parameters
│   │   └── model_card.json            # Model metadata & limitations
│   └── replay/                        # Real OMNI2 historical storm replay files
├── src/
│   ├── engines/                       # Pure TypeScript Discrete Math implementations (M1–M5)
│   ├── components/panels/             # Accessible WCAG AAA HUD overlays & modals
│   ├── scenes/                        # 3D OrbitScene and SurfaceScene (React Three Fiber)
│   ├── store/                         # Reactive Zustand state store
│   └── workers/                       # 60Hz physics Web Worker & in-browser ONNX inference
└── training/                          # Reproducible Python ML pipeline
```

---

## 📚 Sourced Historical Events & Validation Benchmarks

- **SpaceX Starlink Launch Disaster (Feb 3–4, 2022)**: 38 of 49 satellites lost due to $50\%$ atmospheric drag expansion at $210\text{ km}$ injection perigee under a minor G1 geomagnetic storm (Dang et al., 2022, *Space Weather*).
- **May 2024 Geomagnetic Superstorm**: Extreme G5 storm ($Kp = 9, Dst = -412\text{ nT}$) benchmark for constellation cross-link re-routing and ground-induced current modeling (NOAA SWPC).
- **Lunar Topography (Shackleton Crater)**: Digital elevation models and crater rim sky-view shielding derived from NASA Lunar Reconnaissance Orbiter (LRO) LOLA observations.

---

## 📄 Licence & Academic Integrity

This project is licensed under the MIT License. In accordance with strict academic integrity standards:
- Zero metrics, citations, or dates are fabricated.
- Untrained model heads (such as the solar flare head lacking X-ray data) are explicitly labeled as *Not available*.
- Full provenance for every number is documented in [`docs/report/REPORT_FACT_CHECK.md`](docs/report/REPORT_FACT_CHECK.md).
