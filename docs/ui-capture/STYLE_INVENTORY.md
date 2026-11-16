# HelioNet Desktop UI Style Inventory

Extracted automatically from live computed styles (`getComputedStyle`) across desktop (1440x900) views.

## 1. Distinct Colours (with Element Counts)

### Text Colours (`color`)
| Computed Colour | Count |
| :--- | ---: |
| `rgb(232, 230, 225)` | 630 |
| `rgb(139, 143, 152)` | 253 |
| `rgb(242, 163, 58)` | 82 |
| `rgb(127, 166, 201)` | 52 |
| `rgb(123, 174, 127)` | 28 |
| `rgb(229, 83, 61)` | 8 |
| `rgb(14, 15, 18)` | 5 |
| `rgb(255, 255, 255)` | 5 |
| `rgb(42, 45, 52)` | 2 |

### Background Colours (`backgroundColor`)
| Computed Colour | Count |
| :--- | ---: |
| `rgb(14, 15, 18)` | 98 |
| `rgb(22, 24, 29)` | 34 |
| `rgba(242, 163, 58, 0.15)` | 22 |
| `rgb(42, 45, 52)` | 20 |
| `rgba(255, 255, 255, 0.06)` | 12 |
| `rgba(22, 24, 29, 0.85)` | 10 |
| `rgba(123, 174, 127, 0.15)` | 9 |
| `rgb(242, 163, 58)` | 8 |
| `rgba(127, 166, 201, 0.15)` | 8 |
| `rgb(127, 166, 201)` | 7 |
| `rgb(25, 27, 32)` | 6 |
| `rgb(59, 59, 59)` | 5 |
| `rgba(123, 174, 127, 0.1)` | 5 |
| `rgba(229, 83, 61, 0.15)` | 4 |
| `rgba(139, 143, 152, 0.15)` | 4 |
| `rgba(22, 24, 29, 0.98)` | 4 |
| `rgba(14, 15, 18, 0.6)` | 4 |
| `rgba(242, 163, 58, 0.12)` | 3 |
| `rgba(22, 24, 29, 0.88)` | 3 |
| `rgba(14, 15, 18, 0.4)` | 3 |
| `rgba(229, 83, 61, 0.2)` | 2 |
| `rgb(229, 83, 61)` | 2 |
| `rgba(242, 163, 58, 0.2)` | 1 |
| `rgba(123, 174, 127, 0.2)` | 1 |
| `rgba(14, 15, 18, 0.88)` | 1 |
| `rgba(255, 255, 255, 0.12)` | 1 |
| `rgba(242, 163, 58, 0.08)` | 1 |
| `rgba(14, 15, 18, 0.5)` | 1 |
| `rgba(255, 255, 255, 0.05)` | 1 |
| `rgb(123, 174, 127)` | 1 |

### Border Colours (`borderTopColor`)
| Computed Colour | Count |
| :--- | ---: |
| `rgb(42, 45, 52)` | 161 |
| `rgba(242, 163, 58, 0.3)` | 11 |
| `rgba(242, 163, 58, 0.4)` | 8 |
| `rgba(123, 174, 127, 0.25)` | 5 |
| `rgba(123, 174, 127, 0.35)` | 4 |
| `rgba(229, 83, 61, 0.35)` | 4 |
| `rgb(242, 163, 58)` | 4 |
| `rgba(123, 174, 127, 0.3)` | 4 |
| `rgba(127, 166, 201, 0.35)` | 3 |
| `rgba(242, 163, 58, 0.25)` | 3 |
| `rgba(242, 163, 58, 0.35)` | 3 |
| `rgba(229, 83, 61, 0.5)` | 2 |
| `rgba(127, 166, 201, 0.4)` | 2 |
| `rgba(242, 163, 58, 0.5)` | 1 |
| `rgba(123, 174, 127, 0.4)` | 1 |
| `rgba(127, 166, 201, 0.3)` | 1 |

## 2. Typography: Font Families & Sizes

### Font Families
| Font Family | Count |
| :--- | ---: |
| `"IBM Plex Mono", "Courier New", monospace` | 577 |
| `"Bricolage Grotesque", system-ui, sans-serif` | 480 |
| `Arial` | 6 |
| `monospace` | 2 |

### Font Sizes
| Font Size | Count |
| :--- | ---: |
| `12px` | 694 |
| `16px` | 291 |
| `15px` | 27 |
| `13px` | 12 |
| `14px` | 11 |
| `18px` | 10 |
| `11px` | 8 |
| `13.3333px` | 5 |
| `20px` | 3 |
| `54px` | 2 |
| `28px` | 1 |
| `44px` | 1 |

### Text Smaller Than 12px
| View | Font Size | Component | Sample Text |
| :--- | :--- | :--- | :--- |
| 03_Orbit_Calm | `11px` | `span` | C2.1 · R0 |
| 03_Orbit_Calm | `11px` | `span` | (precomputed) |
| 05_Orbit_Confirmed | `11px` | `span` | M1.1 · R1 |
| 05_Orbit_Confirmed | `11px` | `span` | (precomputed) |
| 17_Validation_Modal | `11px` | `span` | C2.0 · R0 |
| 17_Validation_Modal | `11px` | `span` | (precomputed) |
| 14_Surface_View | `11px` | `span` | C5.5 · R0 |
| 14_Surface_View | `11px` | `span` | (precomputed) |

## 3. Radii, Shadows, Blurs & Gradients

### Border Radii
| Value | Count | Sample Components |
| :--- | ---: | :--- |
| `6px` | 77 | button[aria-label="Dive to lunar surface"], button[aria-label="Open validation comparison"], button[aria-label="View about and credits"], span |
| `4px` | 62 | button[aria-label="Return to landing page"], span, div, button[aria-label="Set speed to 1x"] |
| `12px` | 44 | div[heading="A solar storm is coming.HelioN"], button[aria-label="Run the simulation"], div, span |
| `3px` | 24 | div, span |
| `8px` | 16 | div |
| `20px` | 5 | footer[aria-label="Project source and reference links"], button[aria-label="Open agent audit log drawer"] |

### Box Shadows
| Value | Count | Sample Components |
| :--- | ---: | :--- |
| `rgba(0, 0, 0, 0.45) 0px 8px 32px 0px` | 8 | section[aria-label="Space Weather Hazard Alert"], section[aria-label="Simulation Timeline Controls"] |
| `rgba(0, 0, 0, 0.4) 0px 8px 24px 0px` | 8 | aside[aria-label="Space Weather Probability Forecast"], aside[aria-label="Satellite Constellation Health"], aside[aria-label="Lunar Rover Radiation Dose Meter"] |
| `rgba(0, 0, 0, 0.3) 0px 4px 16px 0px` | 4 | button[aria-label="Open agent audit log drawer"] |
| `rgba(0, 0, 0, 0.6) 0px -8px 32px 0px` | 4 | aside[aria-label="Autonomous Agent Execution Log"] |
| `rgba(0, 0, 0, 0.5) 0px 12px 36px 0px` | 1 | div[heading="A solar storm is coming.HelioN"] |
| `rgba(0, 0, 0, 0.6) 0px 24px 48px 0px` | 1 | div[heading="Validation Benchmark Compariso"] |

### Backdrop Filters (Blur)
| Value | Count | Sample Components |
| :--- | ---: | :--- |
| `blur(10px)` | 12 | div, div[aria-label="Solar Weather Metrics"], div[aria-label="Rover Mission Status"] |
| `blur(16px)` | 4 | aside[aria-label="Autonomous Agent Execution Log"] |
| `blur(12px)` | 1 | div[heading="Validation Benchmark Compariso"] |

### Gradients
| Value | Count | Sample Components |
| :--- | ---: | :--- |
| `linear-gradient(to right, rgba(0, 0, 0, 0), rgba(22, 24, 29, 0.95))` | 1 | div |

## 4. Panel Sameness Audit (Identical Radius + Border + Background)

| Signature (`radius | border | bg`) | Matching Panel Count | Components |
| :--- | ---: | :--- |
| `radius=12px | border=1px solid rgb(42, 45, 52) | bg=rgb(22, 24, 29)` | 20 | 02_Landing_Hero: div[heading="A solar storm is coming.HelioN"]; 03_Orbit_Calm: section[aria-label="Space Weather Hazard Alert"]; 03_Orbit_Calm: aside[aria-label="Space Weather Probability Forecast"]; 03_Orbit_Calm: aside[aria-label="Satellite Constellation Health"]; 03_Orbit_Calm: section[aria-label="Simulation Timeline Controls"]; 05_Orbit_Confirmed: section[aria-label="Space Weather Hazard Alert"] |
| `radius=4px | border=1px solid rgb(42, 45, 52) | bg=rgb(14, 15, 18)` | 4 | 03_Orbit_Calm: div; 05_Orbit_Confirmed: div; 17_Validation_Modal: div; 14_Surface_View: div |
| `radius=6px | border=1px solid rgb(42, 45, 52) | bg=rgb(14, 15, 18)` | 4 | 03_Orbit_Calm: div; 05_Orbit_Confirmed: div; 17_Validation_Modal: div; 14_Surface_View: div |
| `radius=8px | border=1px solid rgb(42, 45, 52) | bg=rgb(14, 15, 18)` | 1 | 14_Surface_View: div |
| `radius=8px | border=1px solid rgb(42, 45, 52) | bg=rgba(14, 15, 18, 0.6)` | 1 | 18_About_Page: div |
| `radius=8px | border=1px dashed rgba(242, 163, 58, 0.35) | bg=rgba(14, 15, 18, 0.4)` | 1 | 18_About_Page: div |

## 5. Multi-Meaning Colour Audit

| Colour / Token | Observed Meanings Across UI |
| :--- | :--- |
| **Amber (`#F2A33A` / `rgb(242, 163, 58)`)** | Primary CTA button ("Run the simulation"), "ORBIT VIEW" badge, `WATCH` alert status dot, `ILLUSTRATIVE MODEL` & `Illustrative data` badges, Timeline scrubber accent, Flare Class badge (A/B/C/M), Dose Meter elevated warning (>45%), Dijkstra rerouting status, Agent step icon (`⚡`), Sun / warning accents |
| **Red-Orange (`#E5533D` / `rgb(229, 83, 61)`)** | `CONFIRMED` alert status dot, X-class flare badge, Dose Meter high warning (>80%), Lost satellite indicator, Storm hazard badge |
| **Slate Blue (`#7FA6C9` / `rgb(127, 166, 201)`)** | "Dive to Moon →" / Surface View badge, Active satellite links count, Sky-View Factor metric, Terrain / Rover path |
| **Moss Green (`#7BAE7F` / `rgb(123, 174, 127)`)** | `RESOLVED` status dot, `SHELTERED` status badge, Nominal satellite count, `Optimal` network status, `ONNX MODEL` badge |

## 6. Visible Text Labels by Section (Exact Copy)

### 02_Landing_Hero
- "Solar Storm Constellation & Lunar Defense"
- "A solar storm is coming. is watching."
- "HelioNet"
- "Watch a CME disrupt satellites in real-time orbit. Dive to the lunar south pole as a rover navigates to a radiation shelter. On-device forecasting and autonomous agent decision protocol."
- "Run the simulation →"
- "Telemetry: NOAA SWPC · NASA GSFC"
- "|"
- "Validation"
- "About"

### 03_Orbit_Calm
- "← Home"
- "HelioNet Orbit"
- "ORBIT VIEW"
- "Dive to Moon →"
- "Validation"
- "About"
- "Flare:"
- "C2.1 · R0"
- "X-Ray:"
- "2.1e-6 W/m²"
- "Wind:"
- "410 km/s"
- "Rotate:  · Zoom:  · Pan:"
- "Left Drag"
- "Scroll"
- "Right Drag"
- "WATCH"
- "●"
- "Lead: 24.0 h · p: 35 %"
- "Illustrative replay inspired by the February 2022 storm"
- "Potential Impact"
- "LEO Atmospheric Drag Surge; Satellites at 210 km fail to raise orbit"
- "Autonomous Recommendation"
- "Trigger autonomous orbit boost & safe mode; activate secondary Dijkstra mesh routes"
- "Rule:"
- "RULE_GEO_LEO_DRAG (pGeo >= 0.5 & Kp >= 5)"
- "Evidence: Forecast pGeo = 35% (C/L Threshold: 30%)"
- "✓ Approve"
- "✕ Reject"
- "Forecast Gauges"
- "LEAD: 24.0h"
- "PRECOMPUTED"
- "Geomagnetic Storm"
- "(≥ G1 / Kp 5)"
- "35%"
- "Solar Radiation Storm"
- "(≥ S1 / 10 pfu)"
- "8%"
- "Solar Flare"
- "(≥ M-class / R1)"
- "22%"
- "Platt / Isotonic Calibrated"
- "NOAA SWPC Scale"
- "Constellation Health"
- "120 SATS · 6 PLANES (LEO 53°)"
- "Decay: Exaggerated"
- "120"
- "Nominal"
- "0"
- "At Risk"
- "Lost"
- "Mean Altitude"
- "550.0 km"
- "Active Links"
- "240 active"
- "Mesh Routing"
- "Dijkstra (8 hops)"
- "Kp Index"
- "1.7"
- "Illustrative data"
- "T+00:00h"
- "/ T+24:00h"
- "▶ Play"
- "Space to toggle · ← / → to scrub"
- "Speed:"
- "1x"
- "10x"
- "60x"
- "240x"
- "Agent Audit Log (7 Steps)"
- "⚡"
- "▲"
- "Agent Reasoning Cycle"
- "7-PHASE AUDIT"
- "✕ Close"
- "Cycle Trace (Observe → Analyze → Research → Plan → Act → Confirm → Report)"
- "1. Observe"
- "0.1 ms"
- "2. Analyze"
- "(precomputed)"
- "0 ms"
- "3. Research"
- "4. Plan"
- "5. Act"
- "6. Confirm"
- "7. Report"
- "Historical Analogs (Cosine Sim)"
- "87% Match"
- "Illustrative similarity"
- "No sourced summary"
- "March 1989 Geomagnetic Storm"
- "Severe coronal mass ejection produced severe geomagnetically induced currents (GIC) across North America, trip..."
- "May 2024 G5 Solar Superstorm"
- "Extreme G5 geomagnetic storm driven by complex active region NOAA 3664. Resulted in auroras visible worldwide ..."
- "Knowledge Base Citations"
- "NOAA Geomagnetic Storm Scale (G-scale)"
- "NOAA classifies geomagnetic storms on a scale of G1 to G5. G1 (minor) corresponds to Kp >= 5. G5 (extreme) corresponds t..."
- "Dst (Disturbance Storm Time) Index"
- "The Dst index is a measure of the intensity of the globally symmetrical equatorial electrojet (ring current). Values bel..."

### 05_Orbit_Confirmed
- "← Home"
- "HelioNet Orbit"
- "ORBIT VIEW"
- "Dive to Moon →"
- "Validation"
- "About"
- "Flare:"
- "M1.1 · R1"
- "X-Ray:"
- "1.1e-5 W/m²"
- "Wind:"
- "610 km/s"
- "Rotate:  · Zoom:  · Pan:"
- "Left Drag"
- "Scroll"
- "Right Drag"
- "CONFIRMED"
- "●"
- "Lead: 21.0 h · p: 86 %"
- "Illustrative replay inspired by the February 2022 storm"
- "Potential Impact"
- "LEO Atmospheric Drag Surge; Satellites at 210 km fail to raise orbit"
- "Autonomous Recommendation"
- "Trigger autonomous orbit boost & safe mode; activate secondary Dijkstra mesh routes"
- "Rule:"
- "RULE_GEO_LEO_DRAG (pGeo >= 0.5 & Kp >= 5)"
- "Evidence: Observed Kp = 5.3 >= 5.0 (NOAA G1+ Storm Threshold Crossed)"
- "✓ Approve"
- "✕ Reject"
- "Forecast Gauges"
- "LEAD: 21.0h"
- "PRECOMPUTED"
- "Geomagnetic Storm"
- "(≥ G1 / Kp 5)"
- "86%"
- "Solar Radiation Storm"
- "(≥ S1 / 10 pfu)"
- "30%"
- "Solar Flare"
- "(≥ M-class / R1)"
- "81%"
- "Platt / Isotonic Calibrated"
- "NOAA SWPC Scale"
- "Constellation Health"
- "120 SATS · 6 PLANES (LEO 53°)"
- "Decay: Exaggerated"
- "120"
- "Nominal"
- "0"
- "At Risk"
- "Lost"
- "Mean Altitude"
- "550.0 km"
- "Active Links"
- "240 active"
- "Mesh Routing"
- "Dijkstra (8 hops)"
- "Kp Index"
- "5.3"
- "Illustrative data"
- "T+07:00h"
- "/ T+24:00h"
- "▶ Play"
- "Space to toggle · ← / → to scrub"
- "Speed:"
- "1x"
- "10x"
- "60x"
- "240x"
- "Agent Audit Log (7 Steps)"
- "⚡"
- "▲"
- "Agent Reasoning Cycle"
- "7-PHASE AUDIT"
- "✕ Close"
- "Cycle Trace (Observe → Analyze → Research → Plan → Act → Confirm → Report)"
- "1. Observe"
- "0.1 ms"
- "2. Analyze"
- "(precomputed)"
- "0 ms"
- "3. Research"
- "4. Plan"
- "5. Act"
- "6. Confirm"
- "7. Report"
- "Historical Analogs (Cosine Sim)"
- "March 1989 Geomagnetic Storm"
- "95% Match"
- "Illustrative similarity"
- "Severe coronal mass ejection produced severe geomagnetically induced currents (GIC) across North America, trip..."
- "94% Match"
- "No sourced summary"
- "May 2024 G5 Solar Superstorm"
- "Extreme G5 geomagnetic storm driven by complex active region NOAA 3664. Resulted in auroras visible worldwide ..."
- "Knowledge Base Citations"
- "NOAA Geomagnetic Storm Scale (G-scale)"
- "NOAA classifies geomagnetic storms on a scale of G1 to G5. G1 (minor) corresponds to Kp >= 5. G5 (extreme) corresponds t..."
- "Dst (Disturbance Storm Time) Index"
- "The Dst index is a measure of the intensity of the globally symmetrical equatorial electrojet (ring current). Values bel..."

### 17_Validation_Modal
- "← Home"
- "HelioNet Orbit"
- "ORBIT VIEW"
- "Dive to Moon →"
- "Validation"
- "About"
- "Flare:"
- "C2.0 · R0"
- "X-Ray:"
- "2.0e-6 W/m²"
- "Wind:"
- "520 km/s"
- "Rotate:  · Zoom:  · Pan:"
- "Left Drag"
- "Scroll"
- "Right Drag"
- "RESOLVED"
- "●"
- "Lead: 6.0 h · p: 26 %"
- "Illustrative replay inspired by the February 2022 storm"
- "Potential Impact"
- "LEO Atmospheric Drag Surge; Satellites at 210 km fail to raise orbit"
- "Autonomous Recommendation"
- "Trigger autonomous orbit boost & safe mode; activate secondary Dijkstra mesh routes"
- "Rule:"
- "RULE_GEO_LEO_DRAG (pGeo >= 0.5 & Kp >= 5)"
- "Evidence: Forecast pGeo = 26% (C/L Threshold: 30%)"
- "✓ Approve"
- "✕ Reject"
- "Forecast Gauges"
- "LEAD: 6.0h"
- "PRECOMPUTED"
- "Geomagnetic Storm"
- "(≥ G1 / Kp 5)"
- "26%"
- "Solar Radiation Storm"
- "(≥ S1 / 10 pfu)"
- "12%"
- "Solar Flare"
- "(≥ M-class / R1)"
- "15%"
- "Platt / Isotonic Calibrated"
- "NOAA SWPC Scale"
- "Constellation Health"
- "120 SATS · 6 PLANES (LEO 53°)"
- "Decay: Exaggerated"
- "120"
- "Nominal"
- "0"
- "At Risk"
- "Lost"
- "Mean Altitude"
- "550.0 km"
- "Active Links"
- "240 active"
- "Mesh Routing"
- "Dijkstra (8 hops)"
- "Kp Index"
- "3.0"
- "Illustrative data"
- "T+22:00h"
- "/ T+24:00h"
- "▶ Play"
- "Space to toggle · ← / → to scrub"
- "Speed:"
- "1x"
- "10x"
- "60x"
- "240x"
- "Agent Audit Log (7 Steps)"
- "⚡"
- "▲"
- "Agent Reasoning Cycle"
- "7-PHASE AUDIT"
- "✕ Close"
- "Cycle Trace (Observe → Analyze → Research → Plan → Act → Confirm → Report)"
- "1. Observe"
- "0 ms"
- "2. Analyze"
- "(precomputed)"
- "3. Research"
- "4. Plan"
- "5. Act"
- "6. Confirm"
- "7. Report"
- "Historical Analogs (Cosine Sim)"
- "March 1989 Geomagnetic Storm"
- "89% Match"
- "Illustrative similarity"
- "Severe coronal mass ejection produced severe geomagnetically induced currents (GIC) across North America, trip..."
- "May 2024 G5 Solar Superstorm"
- "Extreme G5 geomagnetic storm driven by complex active region NOAA 3664. Resulted in auroras visible worldwide ..."
- "October 2003 Halloween Solar Storms"
- "88% Match"
- "Series of powerful solar flares peaking at X28+ and extremely fast CMEs (>2000 km/s). Caused G5 extreme geomag..."
- "Knowledge Base Citations"
- "NOAA Geomagnetic Storm Scale (G-scale)"
- "NOAA classifies geomagnetic storms on a scale of G1 to G5. G1 (minor) corresponds to Kp >= 5. G5 (extreme) corresponds t..."
- "Dst (Disturbance Storm Time) Index"
- "The Dst index is a measure of the intensity of the globally symmetrical equatorial electrojet (ring current). Values bel..."
- "Validation Benchmark Comparison"
- "FEATURE 33"
- "Side-by-side ground truth verification · Real documented outcomes vs predicted values"
- "May 2024 (G5)"
- "✕"
- "ℹ"
- "Documented values are entered from sources by the project owner."
- "● RULE 1 & 33 COMPLIANT:"
- "All documented values are sourced from peer-reviewed bulletins and space weather logs. Missing sources are flagged as . Lunar surface routing is labelled ."
- "Unverified"
- "Scenario test"
- "Parameter / Metric"
- "Predicted Value"
- "Documented Outcome"
- "Source / Verification"
- "Classification"
- "Peak Kp Index"
- "3.0 (Predicted)"
- "5.3 (G1 Storm)"
- "✓"
- "https://www.swpc.noaa.gov/products/planetary-k-index#NOAA"
- "Ground Truth"
- "Dst Minimum"
- "-42 nT"
- "-66 nT"
- "https://wdc.kugi.kyoto-u.ac.jp/dstdir/#Kyoto-WDC"
- "Max Solar Wind Speed"
- "690 km/s"
- "https://www.ngdc.noaa.gov/dscovr/#NOAA-NCEI"
- "Peak Atmospheric Density Increase"
- "+48% (at 210 km)"
- "Up to 50% above baseline"
- "https://doi.org/10.1029/2022SW003070"
- "Satellites Deorbited / Lost"
- "0 satellites (simulated)"
- "38 of 49 Starlink Group 4-7"
- "https://doi.org/10.1029/2022SW003070#SpaceX-Report"
- "Lunar Surface Dose Baseline Rate"
- "0.12 mGy/h"
- "https://crater.unh.edu/#LRO-CRaTER"
- "Rover Radiation Shelter Destination"
- "Shelter A (0.0 mGy accumulated)"
- "Benchmarks active: Illustrative replay inspired by the February 2022 storm (7 rows)"
- "Close [Esc]"

### 14_Surface_View
- "← Orbit View"
- "Lunar South Pole · Procedural terrain (placeholder)"
- "SURFACE DIVE"
- "Validation"
- "About"
- "Dose:"
- "0.0 / 50.0 IDU"
- "Status:"
- "RACING"
- "Pan:  · Zoom:  · Orbit:"
- "Left Drag"
- "Scroll"
- "Right Drag"
- "CONFIRMED"
- "●"
- "C5.5 · R0"
- "Lead: 17.0 h · p: 97 %"
- "Illustrative replay inspired by the February 2022 storm"
- "Potential Impact"
- "LEO Atmospheric Drag Surge; Satellites at 210 km fail to raise orbit"
- "Autonomous Recommendation"
- "Trigger autonomous orbit boost & safe mode; activate secondary Dijkstra mesh routes"
- "Rule:"
- "RULE_GEO_LEO_DRAG (pGeo >= 0.5 & Kp >= 5)"
- "Evidence: Observed Kp = 7.7 >= 5.0 (NOAA G1+ Storm Threshold Crossed)"
- "✓ Approve"
- "✕ Reject"
- "Forecast Gauges"
- "LEAD: 17.0h"
- "PRECOMPUTED"
- "Geomagnetic Storm"
- "(≥ G1 / Kp 5)"
- "97%"
- "Solar Radiation Storm"
- "(≥ S1 / 10 pfu)"
- "72%"
- "Solar Flare"
- "(≥ M-class / R1)"
- "76%"
- "Platt / Isotonic Calibrated"
- "NOAA SWPC Scale"
- "Radiation Dose Meter"
- "LUNAR ROVER 01 · SOUTH POLE"
- "Accumulated Dose"
- "Illustrative dose units"
- "0.0"
- "/ 50.0 IDU"
- "Flux Rate r(t)"
- "0.65 IDU/min"
- "Sky-View Factor"
- "0.82 (Approximation)"
- "Destination"
- "Shelter A"
- "Configurable Safety Cap:"
- "50 IDU"
- "Illustrative data"
- "T+11:00h"
- "/ T+24:00h"
- "▶ Play"
- "Space to toggle · ← / → to scrub"
- "Speed:"
- "1x"
- "10x"
- "60x"
- "240x"
- "Agent Audit Log (7 Steps)"
- "⚡"
- "▲"
- "Agent Reasoning Cycle"
- "7-PHASE AUDIT"
- "✕ Close"
- "Cycle Trace (Observe → Analyze → Research → Plan → Act → Confirm → Report)"
- "1. Observe"
- "0 ms"
- "2. Analyze"
- "(precomputed)"
- "3. Research"
- "0.1 ms"
- "4. Plan"
- "5. Act"
- "6. Confirm"
- "7. Report"
- "Historical Analogs (Cosine Sim)"
- "March 1989 Geomagnetic Storm"
- "96% Match"
- "Illustrative similarity"
- "Severe coronal mass ejection produced severe geomagnetically induced currents (GIC) across North America, trip..."
- "October 2003 Halloween Solar Storms"
- "95% Match"
- "Series of powerful solar flares peaking at X28+ and extremely fast CMEs (>2000 km/s). Caused G5 extreme geomag..."
- "May 2024 G5 Solar Superstorm"
- "Extreme G5 geomagnetic storm driven by complex active region NOAA 3664. Resulted in auroras visible worldwide ..."
- "Knowledge Base Citations"
- "NOAA Geomagnetic Storm Scale (G-scale)"
- "NOAA classifies geomagnetic storms on a scale of G1 to G5. G1 (minor) corresponds to Kp >= 5. G5 (extreme) corresponds t..."
- "Dst (Disturbance Storm Time) Index"
- "The Dst index is a measure of the intensity of the globally symmetrical equatorial electrojet (ring current). Values bel..."

### 18_About_Page
- "← Back to Simulation"
- "Validation Benchmarks ↗"
- "Attributions, Ground Truth & Architecture"
- "About HelioNet"
- "HelioNet is an autonomous space weather defense and cislunar telemetry platform. It simulates solar coronal mass ejections hitting a 120-satellite Earth constellation in scenarios such as the default Illustrative replay inspired by the February 2022 storm, computes atmospheric orbital decay, executes multi-objective Pareto routing across procedural terrain (placeholder) for lunar south pole rovers, and evaluates space weather risks using an autonomous 7-phase agent loop."
- "Scientific Data & Asset Attributions"
- "In accordance with project rules, only data sources actually in use are credited below. External asset dependencies planned for future milestones are cataloged under planned credits."
- "Active Credits (In Use)"
- "NASA / GSFC / SVS"
- "Public Domain / NASA Policy"
- "Goddard Space Flight Center Scientific Visualization Studio"
- "Coronal mass ejection (CME) shockwave geometry, SOHO/LASCO coronagraph reference profiles, and solar wind velocity telemetry."
- "NASA Earth Observatory"
- "Public Domain"
- "Earth Atmosphere & Night Lights"
- "Global cloud cover layers, Suomi NPP VIIRS city lights (Black Marble), and Rayleigh/Mie atmospheric scattering profiles."
- "NOAA SWPC"
- "Space Weather Prediction Center"
- "Operational R-scale, S-scale, and G-scale space weather hazard thresholds and real-time solar wind observation schemas."
- "Planned: credited when these assets are added"
- "NASA PGDA LOLA"
- "Planned Asset"
- "LOLA Science Team / GSFC (Planetary Geodynamics Data Archive)"
- "Planned high-resolution Lunar Orbiter Laser Altimeter DEM polar elevation binaries (terrain.bin). Currently using Procedural terrain (placeholder)."
- "Solar System Scope"
- "Planned Asset (CC BY 4.0)"
- "High-Resolution Planetary Texture Maps"
- "Planned external diffuse/specular Earth and lunar photographic surface texture maps. Currently using zero-download procedural shaders."
- "NASA 3D Resources"
- "Planned Asset (Public Domain)"
- "Detailed Spacecraft & Rover CAD Models"
- "Planned GLTF/GLB models for satellite constellation buses and rover chassis. Currently using zero-download parametric Three.js geometry."
- "Architecture & Scientific Invariants"
- "Rule 1: Zero Invented Data"
- "Every number comes from a verified data file or pure mathematical engine. Missing parameters display \"No data\", and simulated rover missions are explicitly labeled \"Scenario test\"."
- "Rule 2: Pure TypeScript Engines"
- "All 24 computational engines in  are pure TypeScript with zero React or Three.js dependencies, operating with seeded  deterministic PRNG."
- "src/engines/"
- "mulberry32"
- "Rule 6: Zero Asset Download"
- "The application boots immediately with zero external asset downloads. If textures or models are not yet cached, procedural geometric and shader fallbacks activate seamlessly."
- "HelioNet Space Weather Platform · Build M6"
- "Return to 3D Simulation"
