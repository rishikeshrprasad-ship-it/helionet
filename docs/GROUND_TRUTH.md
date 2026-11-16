# HelioNet Ground-Truth Verification Report
**Date:** 2026-11-08  
**Mode:** READ-ONLY Verification (No source edits)  
**Standard:** Exact facts and verifiable evidence only; zero guessing.

---

## 1. Repository Status & File Manifest

### Git Commands
```
$ git status --short
fatal: not a git repository (or any of the parent directories): .git

$ git log --oneline -15
fatal: not a git repository (or any of the parent directories): .git
```
*Fact:* The workspace `c:\Users\Rishikesh\Desktop\HelioNet` is not initialized as a git repository (no `.git` directory exists).

### Complete File List (`find src public docs scripts -type f | sort`)
Total files: **212**

```
docs/AUDIT_FEATURES.md
docs/AUDIT_UI.md
docs/CHANGE_MAP.md
docs/SYLLABUS.md
docs/audit-screens/about-1024.png
docs/audit-screens/about-1440.png
docs/audit-screens/about-390.png
docs/audit-screens/agent-drawer-1024.png
docs/audit-screens/agent-drawer-1440.png
docs/audit-screens/agent-drawer-390.png
docs/audit-screens/alert-confirmed-1024.png
docs/audit-screens/alert-confirmed-1440.png
docs/audit-screens/alert-confirmed-390.png
docs/audit-screens/alert-false-alarm-1024.png
docs/audit-screens/alert-false-alarm-1440.png
docs/audit-screens/alert-false-alarm-390.png
docs/audit-screens/alert-resolved-1024.png
docs/audit-screens/alert-resolved-1440.png
docs/audit-screens/alert-resolved-390.png
docs/audit-screens/alert-watch-1024.png
docs/audit-screens/alert-watch-1440.png
docs/audit-screens/alert-watch-390.png
docs/audit-screens/camera-flight-1024.png
docs/audit-screens/camera-flight-1440.png
docs/audit-screens/camera-flight-390.png
docs/audit-screens/error-state-1024.png
docs/audit-screens/error-state-1440.png
docs/audit-screens/error-state-390.png
docs/audit-screens/landing-hero-1024.png
docs/audit-screens/landing-hero-1440.png
docs/audit-screens/landing-hero-390.png
docs/audit-screens/loading-1024.png
docs/audit-screens/loading-1440.png
docs/audit-screens/loading-390.png
docs/audit-screens/nowebgl-1024.png
docs/audit-screens/nowebgl-1440.png
docs/audit-screens/nowebgl-390.png
docs/audit-screens/orbit-calm-1024.png
docs/audit-screens/orbit-calm-1440.png
docs/audit-screens/orbit-calm-390.png
docs/audit-screens/orbit-confirmed-1024.png
docs/audit-screens/orbit-confirmed-1440.png
docs/audit-screens/orbit-confirmed-390.png
docs/audit-screens/orbit-lost-1024.png
docs/audit-screens/orbit-lost-1440.png
docs/audit-screens/orbit-lost-390.png
docs/audit-screens/orbit-rerouted-1024.png
docs/audit-screens/orbit-rerouted-1440.png
docs/audit-screens/orbit-rerouted-390.png
docs/audit-screens/orbit-watch-1024.png
docs/audit-screens/orbit-watch-1440.png
docs/audit-screens/orbit-watch-390.png
docs/audit-screens/surface-dose-rising-1024.png
docs/audit-screens/surface-dose-rising-1440.png
docs/audit-screens/surface-dose-rising-390.png
docs/audit-screens/surface-rover-moving-1024.png
docs/audit-screens/surface-rover-moving-1440.png
docs/audit-screens/surface-rover-moving-390.png
docs/audit-screens/surface-shelter-reached-1024.png
docs/audit-screens/surface-shelter-reached-1440.png
docs/audit-screens/surface-shelter-reached-390.png
docs/audit-screens/surface-shelters-1024.png
docs/audit-screens/surface-shelters-1440.png
docs/audit-screens/surface-shelters-390.png
docs/audit-screens/surface-terrain-1024.png
docs/audit-screens/surface-terrain-1440.png
docs/audit-screens/surface-terrain-390.png
docs/audit-screens/validation-nodata-1024.png
docs/audit-screens/validation-nodata-1440.png
docs/audit-screens/validation-nodata-390.png
docs/kb.json
public/assets/manifest.json
public/favicon.svg
public/icons.svg
public/kb.json
public/models/calibration.json
public/models/events_index.json
public/models/helionet.onnx
public/models/model_card.json
public/onnx-wasm/ort-wasm-simd-threaded.asyncify.mjs
public/onnx-wasm/ort-wasm-simd-threaded.asyncify.wasm
public/onnx-wasm/ort-wasm-simd-threaded.jsep.mjs
public/onnx-wasm/ort-wasm-simd-threaded.jsep.wasm
public/onnx-wasm/ort-wasm-simd-threaded.jspi.mjs
public/onnx-wasm/ort-wasm-simd-threaded.jspi.wasm
public/onnx-wasm/ort-wasm-simd-threaded.mjs
public/onnx-wasm/ort-wasm-simd-threaded.wasm
public/onnx-wasm/ort.all.bundle.min.mjs
public/onnx-wasm/ort.all.min.mjs
public/onnx-wasm/ort.all.mjs
public/onnx-wasm/ort.bundle.min.mjs
public/onnx-wasm/ort.jspi.bundle.min.mjs
public/onnx-wasm/ort.jspi.min.mjs
public/onnx-wasm/ort.jspi.mjs
public/onnx-wasm/ort.min.mjs
public/onnx-wasm/ort.mjs
public/onnx-wasm/ort.node.min.mjs
public/onnx-wasm/ort.wasm.bundle.min.mjs
public/onnx-wasm/ort.wasm.min.mjs
public/onnx-wasm/ort.wasm.mjs
public/onnx-wasm/ort.webgl.min.mjs
public/onnx-wasm/ort.webgl.mjs
public/onnx-wasm/ort.webgpu.bundle.min.mjs
public/onnx-wasm/ort.webgpu.min.mjs
public/onnx-wasm/ort.webgpu.mjs
public/replay/feb2022.json
public/validation/feb2022.json
public/validation/may2024.json
scripts/capture-all.mjs
scripts/capture-landing-polish.mjs
scripts/debug-scene.mjs
scripts/verify-and-screenshot.mjs
scripts/verify-browser.mjs
src/__tests__/onnxLoading.test.ts
src/__tests__/wcagContrast.test.ts
src/assets/hero.png
src/assets/vite.svg
src/components/ErrorBoundary.tsx
src/components/LoadingScreen.tsx
src/components/NoWebGL.tsx
src/components/panels/AgentDrawer.tsx
src/components/panels/AlertCard.tsx
src/components/panels/DoseMeter.tsx
src/components/panels/Forecast.tsx
src/components/panels/OrbitHud.tsx
src/components/panels/PhoneBottomSheet.tsx
src/components/panels/SatelliteHealth.tsx
src/components/panels/SurfaceHud.tsx
src/components/panels/Timeline.tsx
src/components/panels/ValidationModal.tsx
src/engines/__tests__/analogSearch.test.ts
src/engines/__tests__/colouring.test.ts
src/engines/__tests__/confirmFSM.test.ts
src/engines/__tests__/density.test.ts
src/engines/__tests__/derangement.test.ts
src/engines/__tests__/dose.test.ts
src/engines/__tests__/euler.test.ts
src/engines/__tests__/failureProb.test.ts
src/engines/__tests__/huffman.test.ts
src/engines/__tests__/lunarBase.test.ts
src/engines/__tests__/m0.sanity.test.ts
src/engines/__tests__/m1.scene.test.ts
src/engines/__tests__/m3.constellation.test.ts
src/engines/__tests__/m4.lunar.test.ts
src/engines/__tests__/m5.agent.test.ts
src/engines/__tests__/m6.validation.test.ts
src/engines/__tests__/network.test.ts
src/engines/__tests__/orbitDecay.test.ts
src/engines/__tests__/pgf.test.ts
src/engines/__tests__/protection.test.ts
src/engines/__tests__/rook.test.ts
src/engines/__tests__/routeCount.test.ts
src/engines/__tests__/routing.test.ts
src/engines/__tests__/rules.test.ts
src/engines/__tests__/shelterRouting.test.ts
src/engines/__tests__/shielding.test.ts
src/engines/__tests__/terrain.test.ts
src/engines/__tests__/validation.test.ts
src/engines/analogSearch.ts
src/engines/colouring.ts
src/engines/confirmFSM.ts
src/engines/density.ts
src/engines/derangement.ts
src/engines/dose.ts
src/engines/euler.ts
src/engines/failureProb.ts
src/engines/huffman.ts
src/engines/lunarBase.ts
src/engines/network.ts
src/engines/orbitDecay.ts
src/engines/pgf.ts
src/engines/protection.ts
src/engines/random.ts
src/engines/rook.ts
src/engines/routeCount.ts
src/engines/routing.ts
src/engines/rules.ts
src/engines/shelterRouting.ts
src/engines/shielding.ts
src/engines/terrain.ts
src/engines/validation.ts
src/hooks/useAgentLoop.ts
src/hooks/useAsset.ts
src/hooks/useBreakpoint.ts
src/hooks/useModelInference.ts
src/hooks/useReducedMotion.ts
src/hooks/useSimulationWorker.ts
src/hooks/useWorker.ts
src/index.css
src/main.tsx
src/pages/About.tsx
src/pages/App.tsx
src/pages/Landing.tsx
src/scenes/OrbitScene.tsx
src/scenes/SurfaceScene.tsx
src/store/helioStore.ts
src/three/Earth.tsx
src/three/Links.tsx
src/three/LunarRover.tsx
src/three/LunarShelters.tsx
src/three/LunarTerrain.tsx
src/three/Moon.tsx
src/three/RouteLine.tsx
src/three/Satellites.tsx
src/three/Stars.tsx
src/three/StormShell.tsx
src/three/Sun.tsx
src/three/__tests__/assetsFallback.test.ts
src/tokens.ts
src/utils/wcag.ts
src/workers/onnxWorker.ts
src/workers/simulation.worker.ts
```

---

## 2. Test Execution (`npm test`)

**Command:** `npm test` (`vitest run`)  
**Result:**
- **Test Files:** 31 passed / 31 total (0 failed)
- **Tests:** 103 passed / 103 total (0 failed)
- **Duration:** 10.00s

**Breakdown by Test File:**
1. `src/engines/__tests__/analogSearch.test.ts` (3 tests)
2. `src/engines/__tests__/terrain.test.ts` (3 tests)
3. `src/engines/__tests__/m5.agent.test.ts` (3 tests)
4. `src/engines/__tests__/network.test.ts` (5 tests)
5. `src/engines/__tests__/density.test.ts` (5 tests)
6. `src/engines/__tests__/dose.test.ts` (4 tests)
7. `src/engines/__tests__/failureProb.test.ts` (4 tests)
8. `src/__tests__/wcagContrast.test.ts` (4 tests)
9. `src/three/__tests__/assetsFallback.test.ts` (4 tests)
10. `src/engines/__tests__/shelterRouting.test.ts` (3 tests)
11. `src/engines/__tests__/m3.constellation.test.ts` (3 tests)
12. `src/engines/__tests__/protection.test.ts` (2 tests)
13. `src/engines/__tests__/m4.lunar.test.ts` (4 tests)
14. `src/engines/__tests__/m0.sanity.test.ts` (6 tests)
15. `src/__tests__/onnxLoading.test.ts` (3 tests)
16. `src/engines/__tests__/colouring.test.ts` (4 tests)
17. `src/engines/__tests__/m1.scene.test.ts` (3 tests)
18. `src/engines/__tests__/lunarBase.test.ts` (1 test)
19. `src/engines/__tests__/routing.test.ts` (4 tests)
20. `src/engines/__tests__/derangement.test.ts` (3 tests)
21. `src/engines/__tests__/rules.test.ts` (3 tests)
22. `src/engines/__tests__/rook.test.ts` (3 tests)
23. `src/engines/__tests__/pgf.test.ts` (4 tests)
24. `src/engines/__tests__/huffman.test.ts` (4 tests)
25. `src/engines/__tests__/orbitDecay.test.ts` (4 tests)
26. `src/engines/__tests__/shielding.test.ts` (3 tests)
27. `src/engines/__tests__/euler.test.ts` (3 tests)
28. `src/engines/__tests__/confirmFSM.test.ts` (3 tests)
29. `src/engines/__tests__/m6.validation.test.ts` (2 tests)
30. `src/engines/__tests__/routeCount.test.ts` (2 tests)
31. `src/engines/__tests__/validation.test.ts` (1 test)

---

## 3. `src/engines` File & Export Inventory

### Files and Exported Symbols
1. **`analogSearch.ts`**: `cosineSimilarity`, `searchTopAnalogEvents`, `searchKnowledgeBase`
2. **`colouring.ts`**: `dsaturColoring`, `chromaticPolynomial`, `evaluatePolynomial`
3. **`confirmFSM.ts`**: `ConfirmationStateMachine`
4. **`density.ts`**: `DEFAULT_DENSITY_TABLE`, `interpolateDensity`, `sampleStandardNormal`, `OrnsteinUhlenbeckNoise`
5. **`derangement.ts`**: `computeDerangementsCount`, `generateDerangementPermutation`, `isDerangement`
6. **`dose.ts`**: `DOSE_MODEL_LABEL`, `DEFAULT_DOSE_CAP`, `stepRadiationDose`
7. **`euler.ts`**: `findEulerTour`
8. **`failureProb.ts`**: `failureProbGivenSeverity`, `totalFailureProbability`, `exactTwoTerminalUnreliability`, `importanceSamplingUnreliability`
9. **`huffman.ts`**: `buildHuffmanCoding`, `isPrefixFree`, `encodeHuffman`
10. **`lunarBase.ts`**: `analyzeLunarBaseNetwork`
11. **`network.ts`**: `findConnectedComponents`, `computeDegreeDistribution`, `verifyLinkHandshake`, `generateFibonacciGroundPoints`, `computeGroundCoverage`
12. **`orbitDecay.ts`**: `MU_EARTH`, `R_EARTH_M`, `DEFAULT_LOST_ALTITUDE_M`, `ORBIT_DECAY_MODEL_LABEL`, `stepOrbitDecay`
13. **`pgf.ts`**: `computeFailureDistributionPGF`, `evaluatePGF`, `expectedFailures`
14. **`protection.ts`**: `costLossDecision`, `evaluateProtectionPlan`, `greedyBudgetedProtection`, `exhaustiveBudgetedProtection`
15. **`random.ts`**: `mulberry32`
16. **`rook.ts`**: `computeRookPolynomial`, `countValidAssignments`, `verifyPigeonholeCapacity`
17. **`routeCount.ts`**: `combinations`, `countMonotonePaths`
18. **`routing.ts`**: `computeCompositeWeight`, `dijkstraRerouting`, `bellmanFord`, `kruskalMST`, `primMST`
19. **`rules.ts`**: `evaluateExpr`, `extractVariables`, `analyzeRuleSetTruthTable`, `fireRules`, `evaluateRoverShelterDecision`
20. **`shelterRouting.ts`**: `dominates`, `findParetoRoutes`, `selectOptimalShelterRoute`, `bruteForceOptimalPathFixedOnset`
21. **`shielding.ts`**: `SHIELDING_MODEL_LABEL`, `DEFAULT_MAX_RAY_DISTANCE_M`, `NUM_AZIMUTH_RAYS`, `computeSkyViewFactor`, `computeTerrainSkyViewFactorMap`
22. **`terrain.ts`**: `DEFAULT_SLOPE_MAX_DEG`, `DEFAULT_SLOPE_MAX_RAD`, `computeCellTransition`, `getTerrainNeighbors`, `isPixelInHazard`, `computeDiscreteHazardPixelCounts`, `generateLunarSouthPoleHeightmap`
23. **`validation.ts`**: `buildValidationComparison`

### Requested Engine Capabilities Status (28/28 FOUND)

| Capability | Status | Location (`file:function`) |
| :--- | :--- | :--- |
| **density interpolation** | FOUND | `src/engines/density.ts:interpolateDensity` |
| **Ornstein-Uhlenbeck noise** | FOUND | `src/engines/density.ts:OrnsteinUhlenbeckNoise` |
| **circular-orbit decay** | FOUND | `src/engines/orbitDecay.ts:stepOrbitDecay` |
| **failure probability by inclusion-exclusion** | FOUND | `src/engines/failureProb.ts:totalFailureProbability` |
| **failure-count generating function** | FOUND | `src/engines/pgf.ts:computeFailureDistributionPGF` |
| **importance sampling** | FOUND | `src/engines/failureProb.ts:importanceSamplingUnreliability` |
| **exact inclusion-exclusion reliability** | FOUND | `src/engines/failureProb.ts:exactTwoTerminalUnreliability` |
| **DSATUR colouring** | FOUND | `src/engines/colouring.ts:dsaturColoring` |
| **chromatic polynomial** | FOUND | `src/engines/colouring.ts:chromaticPolynomial` |
| **Euler tour** | FOUND | `src/engines/euler.ts:findEulerTour` |
| **Dijkstra** | FOUND | `src/engines/routing.ts:dijkstraRerouting` |
| **Bellman-Ford** | FOUND | `src/engines/routing.ts:bellmanFord` |
| **Kruskal** | FOUND | `src/engines/routing.ts:kruskalMST` |
| **Prim** | FOUND | `src/engines/routing.ts:primMST` |
| **derangement** | FOUND | `src/engines/derangement.ts:computeDerangementsCount`, `generateDerangementPermutation`, `isDerangement` |
| **Huffman** | FOUND | `src/engines/huffman.ts:buildHuffmanCoding`, `isPrefixFree`, `encodeHuffman` |
| **budgeted protection** | FOUND | `src/engines/protection.ts:greedyBudgetedProtection`, `exhaustiveBudgetedProtection` |
| **cost-loss** | FOUND | `src/engines/protection.ts:costLossDecision` |
| **rule engine with truth table** | FOUND | `src/engines/rules.ts:analyzeRuleSetTruthTable`, `fireRules` |
| **terrain graph** | FOUND | `src/engines/terrain.ts:computeCellTransition`, `getTerrainNeighbors` |
| **sky-view factor** | FOUND | `src/engines/shielding.ts:computeSkyViewFactor`, `computeTerrainSkyViewFactorMap` |
| **hazard overlap** | FOUND | `src/engines/terrain.ts:isPixelInHazard`, `computeDiscreteHazardPixelCounts` |
| **dose recurrence** | FOUND | `src/engines/dose.ts:stepRadiationDose` |
| **Pareto shelter routing** | FOUND | `src/engines/shelterRouting.ts:findParetoRoutes`, `selectOptimalShelterRoute` |
| **monotone path count** | FOUND | `src/engines/routeCount.ts:countMonotonePaths` |
| **rook polynomial** | FOUND | `src/engines/rook.ts:computeRookPolynomial` |
| **lunar base analysis** | FOUND | `src/engines/lunarBase.ts:analyzeLunarBaseNetwork` |
| **validation builder** | FOUND | `src/engines/validation.ts:buildValidationComparison` |

---

## 4. Specific Factual Inquiries

### a. Are scenes in `src/three/` or `src/scenes/`?
* **Evidence:**
  - `src/scenes/` contains [`src/scenes/OrbitScene.tsx`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/scenes/OrbitScene.tsx) and [`src/scenes/SurfaceScene.tsx`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/scenes/SurfaceScene.tsx).
  - `src/three/` contains individual Three.js meshes and 3D components: `Earth.tsx`, `Links.tsx`, `LunarRover.tsx`, `LunarShelters.tsx`, `LunarTerrain.tsx`, `Moon.tsx`, `RouteLine.tsx`, `Satellites.tsx`, `Stars.tsx`, `StormShell.tsx`, `Sun.tsx`.
* **Fact:** The top-level scene components are located in **`src/scenes/`**, while **`src/three/`** contains reusable 3D actors/elements.

### b. Does `Sun.tsx` already contain flare prominence code?
* **Evidence:** In [`src/three/Sun.tsx:1-234`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/three/Sun.tsx#L1-L234), there are zero occurrences of "flare" or "prominence". The component only defines:
  1. Primary Sun Body with simplex noise texture (`sunVertexShader`, `sunFragmentShader`, lines 8-148, 207-214)
  2. Outer Corona glow with additive blending (`coronaVertexShader`, `coronaFragmentShader`, lines 217-228)
* **Fact:** **NO.** `Sun.tsx` contains no flare prominence or CME eruption geometry or shader.

### c. Does `AgentDrawer` contain a "mock LLM prompt/response inspector"?
* **Evidence:** [`src/components/panels/AgentDrawer.tsx:1-514`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/components/panels/AgentDrawer.tsx#L1-L514) contains zero occurrences of "LLM", "prompt", "mock", "GPT", or "Claude". It contains exactly three collapsible sections:
  1. Cycle Trace: 7-phase audit execution step list (lines 153-218)
  2. Historical Analogs: Top matches from `events_index.json` (lines 220-279)
  3. Knowledge Base Citations: Citations from `kb.json` (lines 280-350)
* **Fact:** **NO.** The claim in previous CHANGE_MAP text that `AgentDrawer` contains a "mock LLM prompt/response inspector" was completely false.

### d. Is `confirmFSM` a threshold state machine (IDLE, WATCH, CONFIRMED, FALSE_ALARM, RESOLVED) or something "Bayesian"?
* **Evidence:** [`src/engines/confirmFSM.ts:1-154`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/engines/confirmFSM.ts#L1-L154):
  - Line 16: `export type FSMState = 'IDLE' | 'WATCH' | 'CONFIRMED' | 'FALSE_ALARM' | 'RESOLVED'`
  - Lines 61-79: `isThresholdCrossed()` strictly checks physical thresholds (`xray >= 1e-5`, `p10 >= 10.0`, `kp >= 5.0`).
  - Lines 88-150: Transitions `IDLE -> WATCH` if `forecastProb > config.costLossThreshold`, `WATCH -> CONFIRMED` if physical threshold is crossed, `WATCH -> FALSE_ALARM` if lead-time window expires, and `CONFIRMED -> RESOLVED` after 6 hours below threshold.
* **Fact:** It is strictly a **threshold state machine** (`IDLE`, `WATCH`, `CONFIRMED`, `FALSE_ALARM`, `RESOLVED`). It performs zero Bayesian probability updates or posterior calculations.

### e. Where do `kb.json`, `calibration.json`, `events_index.json`, and `public/validation/*.json` actually live?
* **Evidence:** File system verification:
  - `kb.json`: Located at **`public/kb.json`** (and mirror at `docs/kb.json`).
  - `calibration.json`: Located at **`public/models/calibration.json`** (NOT `public/calibration.json`).
  - `events_index.json`: Located at **`public/models/events_index.json`** (NOT `public/events_index.json`).
  - `public/validation/*.json`: Located at **`public/validation/feb2022.json`** and **`public/validation/may2024.json`**.
* **Fact:** Claims in CHANGE_MAP that `calibration.json` or `events_index.json` live directly in `public/` were incorrect; they live under `public/models/`.

### f. List `package.json` dependencies. Is Zod installed?
* **Evidence:** [`package.json:16-43`](file:///c:/Users/Rishikesh/Desktop/HelioNet/package.json#L16-L43):
  - `dependencies`:
    - `@fontsource/bricolage-grotesque`: `^5.3.0`
    - `@fontsource/ibm-plex-mono`: `^5.3.0`
    - `@react-three/drei`: `^10.7.9`
    - `@react-three/fiber`: `^9.8.1`
    - `gsap`: `^3.15.0`
    - `onnxruntime-web`: `^1.30.0`
    - `react`: `^19.2.8`
    - `react-dom`: `^19.2.8`
    - `three`: `^0.186.1`
    - `zustand`: `^5.0.15`
  - `devDependencies`:
    - `@types/node`: `^24.13.3`, `@types/react`: `^19.2.18`, `@types/react-dom`: `^19.2.7`, `@types/three`: `^0.186.0`, `@vitejs/plugin-react`: `^6.1.1`, `@vitest/coverage-v8`: `^5.0.4`, `@vitest/ui`: `^5.0.4`, `jsdom`: `^30.1.2`, `oxlint`: `^1.81.0`, `puppeteer-core`: `^25.14.0`, `typescript`: `~6.0.2`, `vite`: `^8.3.0`, `vite-bundle-visualizer`: `^1.2.1`, `vitest`: `^5.0.4`.
* **Fact:** **NO.** `zod` is **NOT installed** anywhere in `package.json`.

### g. Does "lava tube", "mSv", or "50 mSv" appear anywhere in code or UI? Is dose labelled "Illustrative dose units" everywhere it is shown?
* **Evidence:**
  - Case-insensitive search across `src/` for `"lava tube"`: **0 occurrences** (only shelters named Alpha, Bravo, Charlie, Delta).
  - Case-insensitive search across `src/` for `"mSv"` or `"50 mSv"`: **0 occurrences**.
  - In [`src/components/panels/DoseMeter.tsx:122, 138, 169, 205`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/components/panels/DoseMeter.tsx#L122):
    - Badge: `"Illustrative dose units"`
    - Unit display: `{cumulativeDose.toFixed(1)} / {doseCap.toFixed(1)} IDU`
    - Rate display: `{doseRate.toFixed(2)} IDU/min`
    - Slider: `{doseCap} IDU`
  - In [`src/engines/dose.ts:16`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/engines/dose.ts#L16): `export const DOSE_MODEL_LABEL = 'Illustrative dose units'`.
* **Fact:** "lava tube", "mSv", and "50 mSv" **do not appear anywhere in the source code or UI**. Radiation dose is labeled with **"Illustrative dose units"** and the unit **`IDU`** everywhere it appears.

### h. Which earlier fixes are actually done?
1. **Illustrative labels:** **DONE.** Present on `DoseMeter.tsx`, `Forecast.tsx`, `Timeline.tsx`, `ValidationModal.tsx`, `AgentDrawer.tsx`, `dose.ts`, `orbitDecay.ts`, and `onnxWorker.ts`.
2. **`kb.json` cleanup:** **DONE.** All 5 entries in `public/kb.json` have valid NOAA/Kyoto-WDC HTTPS source links and `needs_verification: false`.
3. **Validation values set to null without a source:** **DONE.** In `public/validation/feb2022.json` and `public/validation/may2024.json`, unverified shelter rows have `"value": null` and `"source": ""`, and `ValidationModal.tsx:435-450` renders an "Unverified" amber badge when `documentedValue === null`.
4. **Mobile bottom sheet:** **DONE.** [`src/components/panels/PhoneBottomSheet.tsx`](file:///c:/Users/Rishikesh/Desktop/HelioNet/src/components/panels/PhoneBottomSheet.tsx) exists (565 lines), mounts in `App.tsx`, and provides a 3-position sheet (`peeking`, `half` with tabs, and `full`).
5. **Math Lab panel:** **NOT BUILT.** No `MathLab` file or panel exists in `src/`.

### i. What is in `public/replay/` and `public/scenarios/` right now?
* **Evidence:**
  - `public/replay/`: contains exactly one file: `[ 'feb2022.json' ]`.
  - `public/scenarios/`: **DOES NOT EXIST**.
* **Fact:** Replay scenarios live exclusively in `public/replay/` (`feb2022.json`). There is no `public/scenarios/` directory.

---
*Report compiled strictly from live command output and filesystem inspection.*
