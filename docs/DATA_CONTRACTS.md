# HelioNet Data Contracts & Pipeline Specifications
**Version:** 1.0.0  
**Status:** Canonical Reference

This document defines the strict runtime schemas, data structures, and physical units for all data ingested by HelioNet. Any offline training or simulation pipeline (e.g. PyMSIS, NOAA SWPC scrapers, ONNX model exporters) must conform to these contracts.

---

## 1. Replay Scenario Files (`public/replay/<scenario_id>.json`)

Defines a continuous chronological sequence of space weather observations and advance forecasts.

### Root Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `schemaVersion` | `string` | Optional | Semantic version of schema (e.g. `"1.0.0"`) |
| `_comment` | `string` | Optional | Provenance documentation or citation |
| `event_id` | `string` | **Yes** | Unique identifier (e.g. `"feb2022"`) |
| `name` | `string` | **Yes** | Human-readable title |
| `label` | `string` | **Yes** | Display tag (`"Illustrative"` or `"Calibrated"`) |
| `rows` | `Array<ReplayRow>` | **Yes** | Chronological sequence of hourly records |

### `ReplayRow` Structure
| Field | Type | Units | Description |
| :--- | :--- | :--- | :--- |
| `t` | `number` | hours | Elapsed simulation time from start ($t \ge 0$) |
| `obs` | `object` | — | Observed telemetry at time $t$ |
| `obs.xray` | `number` | $\text{W/m}^2$ | GOES $0.1\text{–}0.8\text{ nm}$ soft X-ray solar flux |
| `obs.p10` | `number` | pfu | Solar energetic proton flux $\ge 10\text{ MeV}$ ($\text{particles}\cdot\text{cm}^{-2}\cdot\text{s}^{-1}\cdot\text{sr}^{-1}$) |
| `obs.kp` | `number` | $0\text{–}9$ | Planetary geomagnetic Kp index |
| `obs.dst` | `number` | nT | Disturbance Storm Time ring current index |
| `obs.vsw` | `number` | km/s | Interplanetary solar wind bulk velocity |
| `obs.bz` | `number` | nT | IMF magnetic field component perpendicular to ecliptic |
| `forecast` | `object` | — | Model/precomputed probability forecast issued at time $t$ |
| `forecast.pFlare` | `number` | $[0, 1]$ | Calibrated probability of M1+ solar flare |
| `forecast.pProton` | `number` | $[0, 1]$ | Calibrated probability of S1+ solar proton event |
| `forecast.pGeo` | `number` | $[0, 1]$ | Calibrated probability of G1+ geomagnetic storm |
| `forecast.leadH` | `number` | hours | Forecast lead time window (e.g. $24.0$ or $28.0$) |

---

## 2. Validation Datasets (`public/validation/<event_id>.json`)

Stores independently sourced historical benchmark data used to validate the simulation and predictions against published records.

### Root Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `schemaVersion` | `string` | Optional | Schema version (`"1.0.0"`) |
| `event` | `string` | **Yes** | Descriptive event title |
| `event_id` | `string` | **Yes** | Matching event id (e.g. `"feb2022"`) |
| `note` | `string` | **Yes** | Contextual methodology notes |
| `documented_outcome` | `Array<OutcomeItem>` | **Yes** | Empirical benchmarks |

### `OutcomeItem` Structure
| Field | Type | Description |
| :--- | :--- | :--- |
| `field` | `string` | Benchmark parameter name (e.g. `"Peak Kp Index"`, `"Satellites Lost"`) |
| `value` | `string \| number \| null` | Verified value from literature. Must be `null` if unverified or without empirical source |
| `source` | `string` | Direct DOI, NOAA URL, or Kyoto WDC citation link |
| `domain` | `string` | Operational domain (`"space"`, `"satellite"`, `"lunar"`) |

---

## 3. Knowledge Base Catalog (`public/kb.json`)

Reference catalog of space weather scale standards and operational definitions cited in agent reasoning logs.

### Array Item Structure (`Array<KBEntry>`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `schemaVersion` | `string` | Optional (`"1.0.0"`) |
| `id` | `string` | Canonical kebab-case identifier (e.g. `"noaa-r-scale"`, `"goes-xray"`) |
| `title` | `string` | Documented title |
| `summary` | `string` | Scientific definition, physical thresholds, and operational impacts |
| `source` | `string` | Official HTTPS URL (e.g. `https://www.swpc.noaa.gov/...`) |
| `needs_verification` | `boolean` | Set to `false` for verified sources; `true` for unsourced drafts |

---

## 4. Historical Events Catalog (`public/models/events_index.json`)

Historical space weather analog database used for cosine similarity nearest-neighbor retrieval.

### Array Item Structure (`Array<EventIndexEntry>`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `schemaVersion` | `string` | Optional (`"1.0.0"`) |
| `id` | `string` | Unique identifier (e.g. `"halloween-2003"`) |
| `name` | `string` | Common historical storm name |
| `date` | `string` | ISO date string (`YYYY-MM-DD`) |
| `description` | `string` | Summary of storm physics and terrestrial/orbital impact |
| `source` | `string` | Published literature source URL or DOI |
| `embedding` | `number[15]` | Normalized 15-dimensional feature vector for cosine similarity |
| `metrics` | `object` | Extreme parameters recorded during storm |
| `metrics.maxKp` | `number` | Peak Kp index recorded ($0\text{–}9$) |
| `metrics.minDst` | `number` | Minimum Dst index recorded ($\text{nT}$) |
| `metrics.satellitesLost` | `number` | Count of deorbited or permanently disabled spacecraft |
| `metrics.scale` | `string` | Peak NOAA scale rating (`"G1"` to `"G5"`) |

---

## 5. Model Calibration Tables (`public/models/calibration.json`)

Isotonic regression lookup bins and Platt scaling parameters for each space weather hazard.

### Root Object
| Key | Type | Description |
| :--- | :--- | :--- |
| `schemaVersion` | `string` | Schema version (`"1.0.0"`) |
| `flare_m_class` | `HazardCalibration` | Solar flare probability calibration |
| `proton_s1` | `HazardCalibration` | Solar proton radiation storm calibration |
| `geomagnetic_g1` | `HazardCalibration` | Geomagnetic storm probability calibration |

### `HazardCalibration` Structure
- `method`: `"isotonic"` or `"platt"`
- `bins`: `Array<{ raw_min: number, raw_max: number, calibrated: number }>`
- `platt_a`: Logistic slope parameter $A$ in $P = \frac{1}{1 + \exp(Af + B)}$
- `platt_b`: Logistic intercept parameter $B$

---

## 6. Model Metadata Card (`public/models/model_card.json`)

Metadata accompanying any compiled ONNX model artifact (`helionet.onnx`).

### Root Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `schemaVersion` | `string` | Schema version (`"1.0.0"`) |
| `illustrative` | `boolean` | `true` if weights are baseline/dummy; `false` for trained production weights |
| `name` | `string` | Model identifier string |
| `version` | `string` | Semantic model version |
| `description` | `string` | Overview of training dataset and objective |
| `input_shape` | `number[3]` | Input tensor dimension tuple: `[1, 24, 15]` |
| `output_shape` | `number[2]` | Output tensor dimension tuple: `[1, 3]` |
| `outputs` | `string[3]` | Label ordering: `["pGeo", "pProton", "pFlare"]` |
| `architecture` | `string` | High-level layer architecture description |
