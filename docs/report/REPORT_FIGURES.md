# HelioNet: Project Report Figure Catalog

This catalog documents every figure produced for the HelioNet Discrete Mathematics project report, including file location, generation method, component classification, and descriptive captions.

---

| Figure # | Filename | Title | Status / Classification | Generation Method |
| :--- | :--- | :--- | :--- | :--- |
| **Figure 1** | `fig01_landing_page.png` | HelioNet Mission Control Landing View (1440x900) | Real UI / 3D Canvas | Captured via Puppeteer (`capture_screenshots.cjs`) on active local Vite server (`http://localhost:5173`) |
| **Figure 2** | `fig02_orbit_view_calm.png` | Orbital Constellation in Calm Baseline State | Real 3D / Real Graph Topology | Captured via Puppeteer at $T+0\text{ h}$ calm baseline state |
| **Figure 3** | `fig03_watch_state.png` | Alert Card in WATCH Status | Real UI / Conjunction Inference | Captured via Puppeteer with timeline scrubbed to storm onset |
| **Figure 4** | `fig04_confirmed_state.png` | Alert Card in CONFIRMED Status with Action Confirmation | Real UI / FSM Rule Engine | Captured via Puppeteer during storm confirmation state |
| **Figure 5** | `fig05_phone_bottom_sheet.png` | Responsive Mobile View (390x844) with Bottom Sheet | Real UI / Responsive Layout | Captured via Puppeteer at 390x844 mobile viewport |
| **Figure 6** | `fig06_satellites_decaying_rerouted.png` | Constellation Network Re-routing & Orbit Decay | Real Graph / Recurrence Engine | Captured via Puppeteer in Constellation view during storm event |
| **Figure 7** | `fig07_alert_card_statuses.png` | Alert Card State Transitions and FSM Actions | Real UI Component | Cropped element capture of Alert Card in UI |
| **Figure 8** | `fig08_forecast_panel_badge.png` | Space Weather Forecast Panel with Real Model Badge | Real Model Badge / Untrained Flare Head | Cropped element capture showing ONNX Transformer model badge and "Not available" flare head |
| **Figure 9** | `fig09_moon_surface_rover_route.png` | Lunar Surface Rover Evacuation & Topographical Shielding | Real Engine / Procedural Terrain | Captured via Puppeteer in 3D Lunar Surface Scene |
| **Figure 10** | `fig10_dose_panel_rising.png` | Lunar Dose Meter & Shelter Route Invariant Panel | Real Recurrence Calculation | Cropped element capture of DoseMeter panel during lunar transit |
| **Figure 11** | *(Not Built)* | Math Lab Interactive Playground | **NOT AVAILABLE: Math Lab does not exist in codebase** | N/A (Component was not built in the repository) |
| **Figure 12** | `fig12_validation_view.png` | Historical Event Replay & Ground-Truth Validation Modal | Real Replay Data / Historical Benchmarks | Captured via Puppeteer with Validation Modal open |
| **Figure 13** | `fig13_timeline_markers.png` | Timeline Scrubber with Critical Event Markers | Real UI Component | Cropped element capture of Timeline playback bar |
| **Figure 14** | `fig14_terminal_verify.png` | Full Repo Verification Suite (`npm run verify` Terminal Output) | Real Verification CLI Output | Generated via `generate_charts.py` logging exact test runner output |
| **Figure 15** | `fig15_failure_generating_function.png` | Probability Generating Function for Satellite Failure Counts | Real Engine Calculation | Generated via `generate_charts.py` plotting $G(s) = \prod (q_i + p_i s)$ |
| **Figure 16** | `fig16_orbit_decay_curves.png` | Orbital Decay Recurrence Trajectories (Calm vs Storm Surge) | Real Physics Recurrence ($h_{t+1} = h_t - \Delta h$) | Generated via `generate_charts.py` comparing 72h orbital decay |
| **Figure 17** | `fig17_pareto_frontier_routing.png` | Bi-criterion Pareto Optimal Frontier (Time vs Radiation Dose) | Real Label-Setting Algorithm | Generated via `generate_charts.py` mapping non-dominated rover evacuation paths |
| **Figure 18** | `fig18_constellation_graph_failures.png` | Constellation Graph Topology Before and After Solar Surge | Real Graph Theory Simulation | Generated via `generate_charts.py` displaying Handshaking and link failures |
| **Figure 19** | `fig19_kruskal_vs_prim_mst.png` | Minimal Spanning Tree Verification (Kruskal vs Prim) | Real Graph Algorithm Verification | Generated via `generate_charts.py` demonstrating weight equivalence |
| **Figure 20** | `fig20_huffman_code_lengths.png` | Optimal Prefix Huffman Coding vs Fixed-Length Encoding | Real Information Theory Engine | Generated via `generate_charts.py` displaying bit lengths vs Shannon entropy |
| **Figure 21** | `fig21_sensitivity_analysis.png` | Sensitivity Analysis of Decision Thresholds and Cost/Loss | Real Decision Theory Simulation | Generated via `generate_charts.py` exploring $C/L$, $\lambda$, and dose caps |
| **Figure 22** | `fig22_model_metrics_reliability.png` | Space Weather Model Benchmark (Transformer vs Baselines) | Real Trained Models on OMNI2 Archive | Generated via `generate_model_fig.py` plotting TSS, AUC, and Dst RMSE |
| **Figure 23** | `fig23_reliability_diagram.png` | Reliability Diagram & Calibration Curve for Geomagnetic Storms | Real Validation & Test Evaluation | Exported by `training/evaluate.py` during full test evaluation |

---

## Detailed Captions and Visual Descriptions

### Figure 1: Landing Page (`fig01_landing_page.png`)
- **What it shows**: The primary mission control landing overlay rendered over the 3D space scene (Earth, Sun, and orbital paths). Displays the mission summary, primary entry button "Run the simulation", and system status links.
- **Mathematical Interpretation**: Establishes the real-time parameter entry point for the discrete event simulation, bridging orbital mechanics and discrete network graph states.

### Figure 2: Calm Orbit View (`fig02_orbit_view_calm.png`)
- **What it shows**: The 3D Low Earth Orbit (LEO) visualization displaying the Walker-delta constellation of satellites interconnected by inter-satellite cross-links under nominal space weather conditions ($T+0\text{ h}$).
- **Mathematical Interpretation**: Illustrates a 3-regular undirected graph $G=(V, E)$ satisfying Euler's Handshaking Lemma ($\sum \deg(v) = 2|E|$) with maximum algebraic connectivity prior to environmental degradation.

### Figure 3: Alert Card in WATCH Status (`fig03_watch_state.png`)
- **What it shows**: The HUD Alert Card transitioning into the yellow "WATCH" state as incoming solar wind parameters breach preliminary safety thresholds.
- **Mathematical Interpretation**: Reflects the propositional logic rule $P \land Q \implies \text{WATCH}$, where $P \equiv (\hat{p}_{\text{geo}} \ge 0.35)$ and $Q \equiv (Kp \ge 5.0)$.

### Figure 4: Alert Card in CONFIRMED Status (`fig04_confirmed_state.png`)
- **What it shows**: The Alert Card in red "CONFIRMED" status with recommended autonomous defensive action ("Maneuver to safe altitude & reroute mesh links"), awaiting affirmative human-in-the-loop confirmation.
- **Mathematical Interpretation**: Demonstrates the safety invariant enforced by Modus Tollens ($\neg \text{Confirmed} \implies \neg \text{Maneuver}$), preventing unverified automated state changes.

### Figure 5: Phone View with Bottom Sheet (`fig05_phone_bottom_sheet.png`)
- **What it shows**: The fully responsive mobile layout rendered at 390x844 viewport dimensions, displaying the compact header and draggable bottom sheet navigation tabs.
- **Mathematical Interpretation**: Verifies responsive partitioning of discrete state information under constrained screen area budgets without loss of alert accessibility.

### Figure 6: Satellites Decaying & Rerouted (`fig06_satellites_decaying_rerouted.png`)
- **What it shows**: 3D constellation view during peak storm activity, showing satellites undergoing enhanced atmospheric drag and active mesh link re-routing around degraded nodes.
- **Mathematical Interpretation**: Visualizes dynamic graph re-weighting where Dijkstra's algorithm redirects data packets away from high-drag, high-charging nodes with elevated failure probabilities.

### Figure 7: Alert Card Status Details (`fig07_alert_card_statuses.png`)
- **What it shows**: Focused view of the Alert Card showing lead time ("Lead 24 h"), storm probability ("Probability 35%"), flare class classification ("C2.1, R0"), and action approval controls.
- **Mathematical Interpretation**: Displays the calibrated binary event probability output alongside NOAA space weather scale classifications derived from physical space environment inputs.

### Figure 8: Forecast Panel Badge (`fig08_forecast_panel_badge.png`)
- **What it shows**: The Space Weather Forecast drawer featuring the verified "Real model" badge indicating ONNX model inference, and the flare head marked as "Not available".
- **Mathematical Interpretation**: Accurately reflects data contracts and operational model boundaries: trained on NASA OMNI2 hourly data without synthetic flare data fabrication.

### Figure 9: Moon Surface Rover Route (`fig09_moon_surface_rover_route.png`)
- **What it shows**: The 3D lunar surface evacuation scene at Shackleton Crater, depicting a lunar rover navigating along an optimal terrain trajectory toward an underground lava tube shelter.
- **Mathematical Interpretation**: Illustrates the bi-criterion shortest-path trajectory selected from the Pareto-optimal frontier balancing traverse duration against topographical radiation exposure.

### Figure 10: Dose Meter Panel (`fig10_dose_panel_rising.png`)
- **What it shows**: The lunar HUD Dose Meter displaying cumulative astronaut radiation exposure in millisieverts (mSv) alongside real-time shelter arrival time bounds ($T_{\text{arr}} \le 2.0\text{ h}$).
- **Mathematical Interpretation**: Visualizes the discrete dose recurrence $D_{t+1} = D_t + \dot{D}_{\text{free}} \cdot (1 - \eta) \cdot \Delta t$, demonstrating passive terrain shielding attenuation.

### Figure 11: Math Lab (`NOT AVAILABLE`)
- **Status**: **NOT AVAILABLE: Math Lab does not exist in codebase.**
- **Note**: This component was not built in the repository and is omitted from evaluation.

### Figure 12: Validation View Modal (`fig12_validation_view.png`)
- **What it shows**: The validation modal overlay comparing simulated constellation survivability against documented historical space weather disasters (Starlink February 2022 and G5 May 2024 storms).
- **Mathematical Interpretation**: Provides ground-truth benchmark comparison validating recurrence relations against empirical satellite de-orbit logs from NOAA and space-track records.

### Figure 13: Timeline Markers (`fig13_timeline_markers.png`)
- **What it shows**: The interactive timeline scrubber bar at the screen bottom, complete with discrete color-coded event markers indicating alert triggers, storm peak, and recovery milestones.
- **Mathematical Interpretation**: Represents the discrete temporal ordering of the simulation state sequence $t \in \{0, 1, \dots, 72\}\text{ hours}$.

### Figure 14: Terminal Verification Suite (`fig14_terminal_verify.png`)
- **What it shows**: Terminal screenshot of the full automated verification pipeline (`npm run verify`), demonstrating zero TypeScript compiler errors, 38 passing test suites (155 unit tests), and a production bundle size of 1.54 MB.
- **Mathematical Interpretation**: Establishes software correctness, proving that all underlying discrete mathematics algorithms satisfy rigorous automated test assertions.

### Figure 15: Failure Generating Function (`fig15_failure_generating_function.png`)
- **What it shows**: Probability distribution $P(K=k)$ of simultaneous satellite subsystem failures computed via the probability generating function $G(s) = \prod_{i=1}^n (q_i + p_i s)$.
- **Mathematical Interpretation**: Shows polynomial expansion coefficients yielding $P(K=0) = 0.5814$, $P(K=1) = 0.3432$, and expected value $E[K] = G'(1) = 0.500$.

### Figure 16: Orbital Altitude Decay Recurrence (`fig16_orbit_decay_curves.png`)
- **What it shows**: 72-hour orbital altitude decay profiles under calm baseline conditions versus severe geomagnetic storm thermospheric density enhancement.
- **Mathematical Interpretation**: Demonstrates the non-linear altitude loss trajectory modeled by $h_{t+1} = h_t - \beta \rho(h_t) v(h_t) \Delta t$, where storm density increases cumulative 24h decay from 1.93 km to 9.30 km.

### Figure 17: Pareto Optimal Frontier (`fig17_pareto_frontier_routing.png`)
- **What it shows**: Scatter plot of candidate lunar rover evacuation paths mapped across traverse time ($T$) and cumulative radiation dose ($D$).
- **Mathematical Interpretation**: Displays the non-dominated Pareto frontier computed via bi-criterion label-setting, highlighting the elimination of strictly dominated path alternatives (Path D).

### Figure 18: Constellation Graph Topology & Handshaking (`fig18_constellation_graph_failures.png`)
- **What it shows**: Graph theoretical model of the satellite communication network before and after radiation-induced link dropouts.
- **Mathematical Interpretation**: Verifies Euler's Handshaking Lemma ($\sum \deg(v) = 2|E|$) and evaluates graph connectivity and articulation points under edge deletion.

### Figure 19: MST Comparison (Kruskal vs Prim) (`fig19_kruskal_vs_prim_mst.png`)
- **What it shows**: Comparative execution of Kruskal's edge-sorting algorithm and Prim's vertex-growing algorithm on the inter-satellite network.
- **Mathematical Interpretation**: Demonstrates algorithm convergence to identical total tree weight ($W = 19.00$), confirming MST uniqueness for distinct edge weights.

### Figure 20: Huffman Code Lengths vs Shannon Entropy (`fig20_huffman_code_lengths.png`)
- **What it shows**: Code word bit lengths for telemetry alert states generated by optimal prefix Huffman coding compared against baseline fixed-length (3-bit) encoding and theoretical Shannon entropy.
- **Mathematical Interpretation**: Shows average code length $L = 1.70\text{ bits/symbol}$ closely approaching entropy $H = 1.659\text{ bits/symbol}$, achieving a $1.765\times$ transmission compression ratio.

### Figure 21: Sensitivity Analysis (`fig21_sensitivity_analysis.png`)
- **What it shows**: Multi-panel parametric analysis evaluating economic cost/loss decision boundaries, Dijkstra risk penalty weight $\lambda$, and lunar dose constraints.
- **Mathematical Interpretation**: Validates threshold stability: action is mathematically warranted whenever forecast probability $\hat{p} > C/L = 0.20$, matching our decision boundary.

### Figure 22: Space Weather Forecasting Model Benchmarks (`fig22_model_metrics_reliability.png`)
- **What it shows**: Bar chart comparison of True Skill Statistic (TSS), Area Under ROC Curve (AUC), and continuous Dst RMSE across Persistence, Logistic Regression, LightGBM, and the HelioNet Transformer.
- **Mathematical Interpretation**: Provides honest, empirical validation showing Logistic Regression winning TSS ($0.4889$) and LightGBM winning Dst RMSE ($21.64\text{ nT}$), outperforming the small Transformer on tabular space-weather time series.

### Figure 23: Reliability Diagram & Calibration Curve (`fig23_reliability_diagram.png`)
- **What it shows**: Observed empirical event frequency plotted against forecast probability bins on the 2022–2025 test split, before and after Platt / temperature calibration.
- **Mathematical Interpretation**: Demonstrates probability calibration via temperature scaling ($T = 0.6358$), bringing the Brier Score to $0.1826$ and ensuring forecast probabilities reflect true event frequencies.
