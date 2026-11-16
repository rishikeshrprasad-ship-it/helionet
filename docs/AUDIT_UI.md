# HelioNet UI & Visual Design Audit Report

**Audit Date:** October 15, 2026  
**Auditor:** Antigravity Autonomous Agent (DeepMind)  
**Target Environment:** Local Vite Preview Server (`http://127.0.0.1:5173/`)  
**Tested Viewports:** 
- Desktop: `1440×900`
- Tablet: `1024×768`
- Mobile: `390×844` (Apple iPhone 12/13/14 viewport)  
**Screenshots Directory:** `docs/audit-screens/` (66 captured PNG artifacts)

---

## Executive Summary

HelioNet delivers a mathematically grounded space weather platform with pure TypeScript engines, deterministic PRNG replays, and zero CDN dependencies. However, from a user interface and responsive design perspective, the application currently functions as a **desktop-only experience (≥1280px)**. 

When tested on mobile viewports (`390×844`), the interface undergoes a **near-total layout collapse**: the Space Weather Alert card and the Forecast panel occupy the exact same spatial coordinates and overlap by 262px; the Simulation Timeline scrubber card completely buries the Agent Audit Log toggle pill; the top navigation bar breaks into four unformatted wrapped lines that clip the top 74px of panels; and the Validation Modal table overflows horizontally by 315px. Furthermore, 3D hardware assets (satellites, rover, shelters) rely entirely on primitive geometric fallbacks (`boxGeometry`, simple cylinders), Earth renders a glowing additive atmosphere that violates project lighting invariants, and typography relies heavily on uncomfortably small 10px monospace text that fails accessibility thresholds in certain chip states.

---

## Detailed View & State Audit

### 1. Loading Screen (with progress)

- **Screenshot File Names:**
  - `docs/audit-screens/loading-1440.png`
  - `docs/audit-screens/loading-1024.png`
  - `docs/audit-screens/loading-390.png`
- **Layout & Visuals:**
  - Fullscreen modal overlay (`position: fixed; inset: 0; z-index: 9999`) painted in background `#0E0F12`.
  - Centered brand title "HelioNet" rendered in Bricolage Grotesque (`clamp(28px, 6vw, 56px)`, weight 800) in Amber `#F2A33A`.
  - Progress track: `width: min(320px, 80vw); height: 2px; background: #2A2D34; border-radius: 2px`.
  - Progress fill: Active bar rendered in Amber `#F2A33A` with `transition: width 200ms ease`.
  - Subtext: "Initializing HelioNet core — 50%" rendered in IBM Plex Mono 12px in Muted `#8B8F98`.
- **What You See:**
  - A minimalist, stark loading screen with strong brand focus. There is no spinner or neon circular progress ring. The hairline track is elegant and unobtrusive.
  - On `390×844`, the progress bar width scales down to 80vw (312px) cleanly without clipping.
- **Flaws & Criticisms:**
  - The loading phase is extremely brief (~400ms when assets are cached), causing a visual flash ("FOUC-like sensation") before transitioning to the Landing hero.
  - The 2px progress bar height is very thin; on high-DPI mobile screens, users may barely notice the progress indicator moving.

---

### 2. Landing Hero

- **Screenshot File Names:**
  - `docs/audit-screens/landing-hero-1440.png`
  - `docs/audit-screens/landing-hero-1024.png`
  - `docs/audit-screens/landing-hero-390.png`
- **Layout & Visuals:**
  - Centered floating glassmorphism card (`background: rgba(14, 15, 18, 0.45); backdrop-filter: blur(8px); border: 1px solid #2A2D34; border-radius: 16px`).
  - Sits centered in front of the slowly rotating 3D Sun, Earth, and Moon orbit canvas.
  - Headline: "A solar storm is coming. / HelioNet is watching." (`68px` at 1440, `61.4px` at 1024, `36px` at 390). Primary text in `#E8E6E1`, brand name accented in Amber `#F2A33A`.
  - CTA Button: "Run the simulation" (`background: #F2A33A; color: #0E0F12; padding: 14px 38px; font-weight: 700; border-radius: 12px`).
  - Floating Footer Pill: Fixed at bottom (`bottom: 16px`), displaying data attribution credits (`NOAA SWPC · NASA GSFC · Solar System Scope`) and quick-access links to Validation Benchmarks and About page.
- **What You See:**
  - At 1440×900, the composition is striking and cinematic. The dark translucent card frames the text while allowing the illuminated limb of Earth and the rotating starfield to show through.
  - At 1024×768, the layout remains well-proportioned; the card takes 766px width.
  - At 390×844, the hero card occupies 326px of the 390px width (`top: 162px`, `height: 520px`). The footer pill wraps into two lines (`height: 56px`, `left: 0`, `width: 390px`), completely touching the screen edges.
- **Flaws & Criticisms:**
  - The frosted glass blur card (`backdrop-filter: blur(8px)`) feels slightly generic AI/SaaS.
  - On mobile (`390px`), the distance between the bottom of the CTA button and the top of the footer pill is less than 30px, leaving virtually zero visible 3D canvas in the center.

---

### 3. Orbit Scene (Calm, Watch, Confirmed, Satellites Lost, Rerouted Network)

- **Screenshot File Names:**
  - Calm: `docs/audit-screens/orbit-calm-1440.png`, `docs/audit-screens/orbit-calm-1024.png`, `docs/audit-screens/orbit-calm-390.png`
  - Watch: `docs/audit-screens/orbit-watch-1440.png`, `docs/audit-screens/orbit-watch-1024.png`, `docs/audit-screens/orbit-watch-390.png`
  - Confirmed: `docs/audit-screens/orbit-confirmed-1440.png`, `docs/audit-screens/orbit-confirmed-1024.png`, `docs/audit-screens/orbit-confirmed-390.png`
  - Satellites Lost: `docs/audit-screens/orbit-lost-1440.png`, `docs/audit-screens/orbit-lost-1024.png`, `docs/audit-screens/orbit-lost-390.png`
  - Rerouted Network: `docs/audit-screens/orbit-rerouted-1440.png`, `docs/audit-screens/orbit-rerouted-1024.png`, `docs/audit-screens/orbit-rerouted-390.png`
- **Layout & Scene Coverage (1440×900):**
  - **Top Banner:** `top: 16px; left: 16px; right: 16px; height: 42px`. Left side holds navigation (`← Home`, title, `ORBIT VIEW` chip, `Dive to Moon →`, `Validation`, `About`). Right side holds mouse interaction hint (`Left Drag · Scroll · Right Drag`).
  - **Left Panel (Alert Card):** `top: 72px; left: 16px; width: 320px; height: 344px`. Floats over the dark side of Earth's orbital plane.
  - **Right Top Panel (Forecast):** `top: 72px; right: 16px; width: 300px; height: 222px`. Floats over the upper-right starfield.
  - **Right Bottom Panel (Satellite Health):** `top: 320px; right: 16px; width: 300px; height: 254px`. Sits 26px below the Forecast panel.
  - **Bottom Center (Timeline Scrubber):** `bottom: 20px; left: 50%; transform: translateX(-50%); width: 760px; height: 110px`.
  - **Bottom Left (Agent Pill):** `bottom: 100px; left: 16px; width: 233px; height: 29px`.
  - **3D Scene Visibility:** The center 800px is clear. Earth sits at center `(0, 0, 0)`, diameter 20 units. 120 satellites orbit in 6 planes (inclination 53°). Optical intersatellite links form a mesh cage around Earth.
- **Visuals Across States:**
  - **Calm (T=0 to T=2h):** Kp = 1.7, pGeo = 22%. Alert card is hidden or in idle. 120 satellites rendered in Nominal `#E8E6E1`. 240 active laser links rendered in Slate Blue `#7FA6C9` (opacity 0.3).
  - **Watch (T=3 to T=6h):** Kp = 3.3 to 4.7, pGeo = 55% to 79%. Alert card slides in from left (`300ms ease`) with Amber chip `● WATCH` (`#F2A33A`). Recommended action warns of drag surge.
  - **Confirmed (T=7 to T=12h):** Kp = 5.3 to 7.7. Status chip turns Red-Orange `● CONFIRMED` (`#E5533D`). The CME storm shell expands from the Sun, engulfing the LEO orbital shell.
  - **Satellites Lost (T=11h):** Atmospheric density surge triggers decay. Satellites at lower perigees fail. Nominal count drops; Lost count rises. Decayed satellites turn Red-Orange `#E5533D` and scale down. A billboard sprite label "Decay: Exaggerated" attaches to decaying satellites.
  - **Rerouted Network (T=11h to T=14h):** As failed nodes disconnect, broken intersatellite links dissolve over 400ms. The Dijkstra routing engine computes an alternate mesh path; the new route draws in progressively over 600ms in prominent Amber `#F2A33A` (opacity 0.9).
- **Flaws & Criticisms:**
  - **Flat 3D Satellites:** Satellites are literal rectangular boxes (`boxGeometry args={[0.35, 0.35, 0.55]}`) with unshaded `meshBasicMaterial`. They look like primitive debug markers rather than modern space hardware.
  - **Microscopic Size:** At camera distance 48, each satellite is approximately 2–3 pixels wide on a 1440×900 display.
  - **Overcrowded HUD on Tablet (1024×768):** Timeline scrubber (`left: 132px`) collides with the Agent Pill (`right: 249px`), overlapping by 117 horizontal pixels.
  - **Catastrophic Collision on Mobile (390×844):** The Alert Card (`left: 16px; width: 320px`) and Forecast Panel (`right: 16px; width: 300px; left: 74px`) occupy the same vertical band (`top: 72px`), overlapping across 262px of their width. The two panels form an illegible jumble of text.

---

### 4. Camera Flight from Orbit to Surface

- **Screenshot File Names:**
  - `docs/audit-screens/camera-flight-1440.png`
  - `docs/audit-screens/camera-flight-1024.png`
  - `docs/audit-screens/camera-flight-390.png`
- **Motion Dynamics & Evaluation:**
  - **Trigger:** Clicking "Dive to Moon →" in the top HUD.
  - **Flight Duration:** Exactly 2.5 seconds, driven by GSAP (`power2.inOut`).
  - **Trajectory:**
    - Initial high-altitude perspective: Camera starts at `[targetPos[0], targetPos[1] + 75, targetPos[2] + 65]` looking down at Shackleton Crater.
    - Final surface landing: Camera sweeps downward and levels out at `[targetPos[0] - 12, targetPos[1] + 8, targetPos[2] + 16]` with `target = [-34, 1.2, -31]`.
  - **Smoothness:**
    - The easing curve (`power2.inOut`) is smooth and cinematic. The camera decelerates naturally as the terrain elevations come into focus.
    - No camera teleportation or angular jerking was observed.
  - **Shader / Asset Transition:**
    - The Orbit scene unmounts, and the lazy-loaded `SurfaceScene` mounts under React `Suspense`. 
    - The procedural 128×128 LOLA DEM heightmap and 16-ray Sky-View Factor (SVF) calculation execute on CPU in ~18ms before the terrain mesh is constructed. No visible hitch or frame freeze was recorded during the flight.
- **Flaws & Criticisms:**
  - During the flight, the Orbit HUD and panels abruptly swap to the Surface HUD. A fading or coordinated UI transition between the orbit bento and surface bento would look far more polished.

---

### 5. Surface Scene (Terrain, Rover Moving, Shelters, Dose Meter Rising, Shelter Reached)

- **Screenshot File Names:**
  - Terrain: `docs/audit-screens/surface-terrain-1440.png`, `surface-terrain-1024.png`, `surface-terrain-390.png`
  - Rover Moving: `docs/audit-screens/surface-rover-moving-1440.png`, `surface-rover-moving-1024.png`, `surface-rover-moving-390.png`
  - Shelters: `docs/audit-screens/surface-shelters-1440.png`, `surface-shelters-1024.png`, `surface-shelters-390.png`
  - Dose Meter Rising: `docs/audit-screens/surface-dose-rising-1440.png`, `surface-dose-rising-1024.png`, `surface-dose-rising-390.png`
  - Shelter Reached: `docs/audit-screens/surface-shelter-reached-1440.png`, `surface-shelter-reached-1024.png`, `surface-shelter-reached-390.png`
- **Layout & Visuals:**
  - **Terrain:** 128×128 heightmap representing Shackleton crater rim. Lit by a low-angle grazing directional light (`position: [-80, 18, -40]`, color `#FFF2D6`, intensity 2.8), mimicking real lunar polar illumination where shadows stretch dramatically across crater floors.
  - **Radiation Heatmap:** Terrain vertices are coloured by Sky-View Factor (SVF): deep shielded crater floors are tinted subtle Moss `#7BAE7F`, while exposed ridges are tinted Amber `#F2A33A`.
  - **Shelters:** Three habitat domes (Alpha, Beta, Gamma) marked with billboard text sprites showing capacity (e.g. `Shackleton Rim Alpha [4/4 Cap] Nominal`).
  - **Route Line:** Amber bi-criterion Pareto optimal route line hovering 0.35 units above terrain.
  - **Autonomous Rover:** 6-wheel rocker-bogie chassis with solar mast and an anchored status label sprite (`LUNAR ROVER 01 · RACING` in Amber, switching to `SHELTERED` in Moss).
  - **Radiation Dose Meter (Right Panel):** Displays large accumulated dose readout (`28px mono`), safety cap slider (`20 to 100 IDU`), flux rate $r(t)$, and SVF factor.
- **Animation Execution:**
  - When simulation playback is started, the rover interpolates smoothly along the waypoint path.
  - The Dose Meter progress bar rises continuously from 0.0 to 34.2 IDU, changing color dynamically from Moss (`<45%`) to Amber (`45–80%`).
  - Upon reaching Shelter Alpha (`roverProgress >= 1.0`), the rover status updates to "SHELTERED", the dose stops accumulating, the status chip turns Moss, and the destination badge reads "SHELTERED (95% Shielded)".
- **Flaws & Criticisms:**
  - **Toy-Like Habitat Geometry:** The shelters are composed of raw low-poly hemispheres (`args={[1.8, 16, 12]}`) and a simple grey cylinder for an airlock. They look like toy blocks rather than pressurized lunar regolith-covered outposts.
  - **1px Route Line Thickness:** WebGL ignores `linewidth: 3` on Windows; the route line renders as a thin 1px wire that flickers (aliasing artifacts) against crater ridges.
  - **Illustrative Dose Units (IDU):** The dose meter uses "IDU" instead of standard scientific units (mSv / Gy), creating an impression of synthetic toy data.

---

### 6. Alert Card in Each Status

- **Screenshot File Names:**
  - Watch: `docs/audit-screens/alert-watch-1440.png`, `alert-watch-1024.png`, `alert-watch-390.png`
  - Confirmed: `docs/audit-screens/alert-confirmed-1440.png`, `alert-confirmed-1024.png`, `alert-confirmed-390.png`
  - Resolved: `docs/audit-screens/alert-resolved-1440.png`, `alert-resolved-1024.png`, `alert-resolved-390.png`
  - False Alarm: `docs/audit-screens/alert-false-alarm-1440.png`, `alert-false-alarm-1024.png`, `alert-false-alarm-390.png`
- **Visuals & Status Chip Verification:**
  - **WATCH:**
    - Chip: `● WATCH`, `background: rgba(242, 163, 58, 0.18); color: #F2A33A; border: 1px solid rgba(242, 163, 58, 0.4)`.
    - Text: "Lead: 24.0 h · p: 35%", Title: "February 2022 Geomagnetic Storm (Starlink Incident)".
    - Buttons: "✓ Approve" in Moss, "✕ Reject" in Red-Orange.
  - **CONFIRMED:**
    - Chip: `● CONFIRMED`, `background: rgba(229, 83, 61, 0.18); color: #E5533D; border: 1px solid rgba(229, 83, 61, 0.4)`.
    - Evidence: "Observed Kp = 5.3 >= 5.0 (NOAA G1+ Storm Threshold Crossed)".
  - **RESOLVED:**
    - Chip: `● RESOLVED`, `background: rgba(139, 143, 152, 0.15); color: #8B8F98; border: 1px solid #2A2D34`.
  - **FALSE ALARM:**
    - Chip: `● FALSE_ALARM`, `background: rgba(139, 143, 152, 0.15); color: #E8E6E1; border: 1px solid #2A2D34`.
- **Flaws & Criticisms:**
  - **Missing Dedicated Token for FALSE ALARM:** In `AlertCard.tsx`, the `switch(status)` statement does not have a `case 'FALSE_ALARM'`. It falls into `default:`, resulting in an unstyled generic muted chip with white text.
  - **Poor Contrast on RESOLVED Chip:** Muted text `#8B8F98` over `#16181D` with 15% tint produces a contrast ratio of **4.35:1**, failing WCAG AA (minimum 4.5:1).
  - **Microscopic 10px Meta-Labels:** "POTENTIAL IMPACT" and "AUTONOMOUS RECOMMENDATION" are set to 10px uppercase mono, which is barely legible.

---

### 7. Agent Log Drawer Open

- **Screenshot File Names:**
  - `docs/audit-screens/agent-drawer-1440.png`
  - `docs/audit-screens/agent-drawer-1024.png`
  - `docs/audit-screens/agent-drawer-390.png`
- **Layout & Visuals (1440×900):**
  - Drawer slides up from bottom (`height: 320px; background: rgba(22, 24, 29, 0.96); backdrop-filter: blur(16px); border-top: 1px solid #2A2D34; z-index: 40`).
  - Header: "Autonomous Agent Reasoning Cycle" with Moss badge `7-PHASE AUDIT LOG` and close button `✕ Close`.
  - 3-Column Split Grid (`gridTemplateColumns: '1.2fr 1fr 1fr'`, gap 20px):
    - **Column 1 (Execution Trace):** 7 phase steps (1. Observe, 2. Analyze, 3. Research, 4. Plan, 5. Act, 6. Confirm, 7. Report) with execution latency in milliseconds (e.g. `0.12 ms`).
    - **Column 2 (Historical Analogs):** Top 3 analog events from cosine similarity over `events_index.json` (e.g. "Halloween Storms 2003 · 92% Match").
    - **Column 3 (Knowledge Base Citations):** Grounded citations from `docs/kb.json` (e.g. "LEO Neutral Density Response").
- **Flaws & Criticisms:**
  - **Hardcoded 3-Column Grid on Mobile:** In `AgentDrawer.tsx`, line 110 hardcodes `gridTemplateColumns: '1.2fr 1fr 1fr'` without a media query. On `390px` mobile, the 3 columns are squeezed into ~115px each. Text wraps after 1–2 words per line, and cards overflow awkwardly.
  - **Drawer Height on Mobile:** A fixed 320px drawer on an 844px mobile screen occupies almost 40% of the screen height, but because the columns cannot stack vertically, none of the 3 columns can be read properly.

---

### 8. Validation View with "No Data"

- **Screenshot File Names:**
  - `docs/audit-screens/validation-nodata-1440.png`
  - `docs/audit-screens/validation-nodata-1024.png`
  - `docs/audit-screens/validation-nodata-390.png`
- **Layout & Visuals:**
  - Centered dialog modal (`max-width: 1020px; max-height: 90dvh`) over blurred backdrop (`rgba(14, 15, 18, 0.85); backdrop-filter: blur(12px)`).
  - Header: Title, `FEATURE 33` amber badge, event toggle switch (`Feb 2022 (Starlink)` vs `May 2024 (Gannon G5)`), and close button `✕`.
  - Compliance Banner: "● RULE 1 & 33 COMPLIANT: All documented values are sourced from peer-reviewed bulletins... Missing sources are flagged as Unverified. Lunar surface routing is labelled Scenario test."
  - Table: 5 columns: `Parameter / Metric`, `Predicted Value`, `Documented Outcome`, `Source / Verification`, `Classification`.
  - "No data" Verification:
    - Row: `Thermospheric Nitric Oxide Cooling Flux` -> Predicted: *No data* (rendered in italic muted `#8B8F98`).
    - Row: `Mid-Latitude Ionospheric Total Electron Content Drop` -> Predicted: *No data*.
    - Unverified metrics display prominent Amber badge `Unverified`.
    - Lunar rover metrics display Slate Blue badge `Scenario test`.
- **Flaws & Criticisms:**
  - **Severe Table Overflow on Mobile (390px):** While the modal container scales to 342px, the HTML table requires a minimum width of 658px to fit the 5 columns. The modal body allows horizontal scrolling, but there is no visual scroll affordance or fade edge, leading users to think the right columns are missing.

---

### 9. Error State & WebGL-Unavailable Fallback

- **Screenshot File Names:**
  - Error State: `docs/audit-screens/error-state-1440.png`, `error-state-1024.png`, `error-state-390.png`
  - WebGL Unavailable: `docs/audit-screens/nowebgl-1440.png`, `nowebgl-1024.png`, `nowebgl-390.png`
- **Error State (Forced Panel Failure in Forecast Bento):**
  - Caught by `<ErrorBoundary label="Forecast Bento">`.
  - Rather than crashing the application or blanking the canvas, only the Forecast bento collapses into an isolated error card (`background: #16181D; border: 1px solid #2A2D34; border-radius: 12px; padding: 16px`).
  - Text: "Forecast Panel error" (Red-Orange `#E5533D`, bold) followed by message: "NOAA SWPC Telemetry Service 503 Unavailable: Data stream lost."
  - Action: "Retry" button in mono font that resets boundary state on click.
  - The rest of the app (3D Canvas, Orbit HUD, Satellite Health, Timeline, Alert Card) continues running without interruption.
- **WebGL-Unavailable Fallback (`<NoWebGL />`):**
  - Full-screen fallback rendered when `isWebGLAvailable()` returns false.
  - Clean centered typography in background `#0E0F12`:
    - Title: "HelioNet" (Amber `#F2A33A`, 48px, font-weight 800).
    - Explanation: "WebGL is not available in this browser or device. HelioNet requires WebGL 2 to render the 3D scenes." (IBM Plex Mono 14px, line-height 1.6).
    - Guidance: "Try updating your browser, enabling hardware acceleration, or using a different device." (IBM Plex Mono 12px).
- **Flaws & Criticisms:**
  - In `<NoWebGL />`, there is no option or button to view telemetry in a pure 2D/table mode. If WebGL is absent, the entire application becomes inaccessible.

---

### 10. /about Page

- **Screenshot File Names:**
  - `docs/audit-screens/about-1440.png`
  - `docs/audit-screens/about-1024.png`
  - `docs/audit-screens/about-390.png`
- **Layout & Visuals:**
  - Dedicated full-page route (`min-height: 100dvh; background: #0E0F12; color: #E8E6E1; padding: 40px 24px 80px`).
  - Top Navigation: `← Back to Simulation` button and `Validation Benchmarks ↗` button.
  - Header: "About HelioNet" (`44px` at 1440, `32px` at 390) with mission statement detailing space weather defense and 7-phase agent loop.
  - Scientific Attributions Section: Grid of 5 attribution cards:
    1. NASA / GSFC / SVS (Public Domain)
    2. Solar System Scope (CC BY 4.0 License)
    3. NASA 3D Resources (Public Domain)
    4. NASA Earth Observatory (Public Domain)
    5. NASA PGDA LOLA (LOLA Science Team / GSFC)
  - System Rules & Engineering Invariants Section: 3-column breakdown of Rule 1 (Zero Invented Data), Rule 2 (Pure TypeScript Engines), and Rule 6 (Zero Asset Download).
- **What You See:**
  - Clean, readable scientific documentation. The multi-column attribution cards reflow into a clean single column on mobile (`390px`).
- **Flaws & Criticisms:**
  - Top navigation buttons on mobile are slightly cramped.
  - The page has no imagery or diagrams illustrating the hardware architecture described in the text.

---

## Technical Audits

### Typography & Token Mismatch Table

| Token Name | Token Hex | Computed / Rendered Value | Status / Location |
| :--- | :--- | :--- | :--- |
| `background` | `#0E0F12` | `rgb(14, 15, 18)` (`#0E0F12`) | **Exact Match** across all full-screen containers. |
| `surface` | `#16181D` | `rgb(22, 24, 29)` (`#16181D`) | **Exact Match** across all bento cards & HUD bars. |
| `hairline` | `#2A2D34` | `rgb(42, 45, 52)` (`#2A2D34`) | **Exact Match** on borders. Used as background in Timeline play button. |
| `text` | `#E8E6E1` | `rgb(232, 230, 225)` (`#E8E6E1`) | **Exact Match** across headings and primary labels. |
| `muted` | `#8B8F98` | `rgb(139, 143, 152)` (`#8B8F98`) | **Exact Match** on secondary text. |
| `amber` | `#F2A33A` | `rgb(242, 163, 58)` (`#F2A33A`) | **Exact Match** on buttons, WATCH chips, Sun shaders. |
| `slateBlue` | `#7FA6C9` | `rgb(127, 166, 201)` (`#7FA6C9`) | **Exact Match** on links, surface indicators, Earth atmosphere. |
| `redOrange` | `#E5533D` | `rgb(229, 83, 61)` (`#E5533D`) | **Exact Match** on CONFIRMED chips, lost satellites. |
| `moss` | `#7BAE7F` | `rgb(123, 174, 127)` (`#7BAE7F`) | **Exact Match** on nominal satellites, approve buttons. |
| *Off-Token* | *None* | `#FFF5E4` / `#FFF3E0` | Sun core and point light peach tones. |
| *Off-Token* | *None* | `#B84A12` | Sun granulation dark tone. |
| *Off-Token* | *None* | `#142438` / `#3D5242` | Procedural Earth ocean & land shader fallbacks. |

### Font Rendering Verification
- **Heading Font:** `"Bricolage Grotesque", system-ui, sans-serif` — Verified rendering correctly via self-hosted woff2 files.
- **Monospace Font:** `"IBM Plex Mono", "Courier New", monospace` — Verified rendering correctly across all data metrics, code chips, and coordinates.

---

### 3D Graphics Quality & Physical Invariants

1. **Sun Glow vs Object Glow:**
   - **SPECIFICATION:** *"the Sun glow (should be the only glowing object)"*
   - **AUDIT FINDING (VIOLATION):** While the Sun features an additive corona (`#F2A33A`), `Earth.tsx` (lines 278–290) mounts an outer atmosphere sphere mesh with `THREE.AdditiveBlending` and `uAtmosphereColor` (`#7FA6C9`). This creates an artificial blue glow around Earth that directly violates the invariant that only the Sun may glow.
2. **Satellite Bus Geometry:**
   - Satellites are rendered as instanced primitive boxes (`0.35 × 0.35 × 0.55`) using unlit `meshBasicMaterial`. They lack solar panel wings, antenna booms, or any discernible satellite silhouette.
3. **Lunar South Pole Lighting:**
   - Grazing directional light (`#FFF2D6`, intensity 2.8 at low angle) correctly models polar lunar lighting conditions, casting long shadows across crater rims.
4. **Terrain Resolution:**
   - 128×128 grid spans 100×100 scene units. Elevation interpolation is smooth, but 1px route line aliasing occurs at grazing camera angles.

---

### Responsive Breakdown Matrix (1440 vs 1024 vs 390)

| Viewport | Element / Panel | Observed Behavior | Defect Classification |
| :--- | :--- | :--- | :--- |
| **1440×900** | All Panels | Clear spatial distribution, zero overlaps, expansive 3D view. | **Pass** |
| **1024×768** | Timeline & Agent Pill | Timeline card (`left: 132px`) overlaps Agent pill (`right: 249px`) by 117px. | **Medium Severity** |
| **1024×768** | Header Hint | Control hints wrap slightly, increasing height from 42px to 57px. | **Low Severity** |
| **390×844** | Alert Card & Forecast | Both placed at `top: 72px`; overlap horizontally by 262px. Complete collision. | **High Severity (Critical)** |
| **390×844** | Alert & Sat Health | Alert card bottom (416px) collides vertically with Sat Health top (320px). | **High Severity (Critical)** |
| **390×844** | Timeline & Agent Pill | Timeline card (height 195px) completely covers the Agent Pill. Pill is hidden. | **High Severity (Critical)** |
| **390×844** | Header Bar | Flex row without mobile menu wraps into 4 messy rows (height 130px). | **High Severity** |
| **390×844** | Agent Drawer | Hardcoded `1.2fr 1fr 1fr` 3-column grid crushes content into 100px columns. | **High Severity** |
| **390×844** | Validation Modal | 5-column table requires 658px, overflowing 342px modal container by 315px. | **Medium Severity** |

---

### Accessibility & Reduced Motion Audit

1. **Contrast Ratios (WCAG AA Target: ≥ 4.5:1 for normal text):**
   - Heading `#E8E6E1` on Surface `#16181D`: **14.24:1** (Passes AAA)
   - Amber `#F2A33A` on Surface `#16181D`: **8.52:1** (Passes AAA)
   - Muted `#8B8F98` on Surface `#16181D`: **5.48:1** (Passes AA)
   - Red-Orange `#E5533D` on Surface `#16181D`: **4.77:1** (Passes AA, borderline)
   - RESOLVED Status Chip (`#8B8F98` on 15% tinted surface): **4.35:1** (**FAILS WCAG AA**)
2. **Keyboard Focus & Tab Order:**
   - Tab key navigates in logical DOM order: Header navigation -> Alert buttons -> Scrubber -> Speed buttons -> Agent drawer.
   - Focus outline is styled with `outline: 2px solid var(--color-amber); outline-offset: 2px;` and is clearly visible on dark surfaces.
3. **Prefers-Reduced-Motion:**
   - When `prefers-reduced-motion: reduce` is active:
     - CSS transition and animation durations are clamped to `0.01ms !important`.
     - 3D cinematic camera orbit is stopped (`CameraRig` delta check).
     - Camera dive immediately snaps to target position without GSAP tweening.
     - Sun surface rotation is stopped. Fully compliant with Rule 8.

---

### Generic-Look Assessment

- **Does it look like a generic dark theme with neon cyan glow?**
  - **No.** The palette adheres strictly to warm amber (`#F2A33A`), slate blue (`#7FA6C9`), and deep charcoal (`#0E0F12`, `#16181D`). There are no saturated cyan glows, purple gradients, or neon lasers.
- **Where does it veer towards generic templates?**
  - The Landing page centered hero card with `backdropFilter: blur(8px)` and rounded 16px corners looks like a standard Tailwind/Next.js SaaS template.
  - The Earth atmosphere additive halo gives Earth a soft sci-fi video game appearance rather than a real planetary limb.

---

## Issues Summary Table

| View / Component | Issue Description | Severity | File |
| :--- | :--- | :--- | :--- |
| **Orbit / Surface HUD** | Alert Card & Forecast Panel collide and overlap by 262px at 390px width | **High** | `src/components/panels/AlertCard.tsx` / `Forecast.tsx` |
| **Orbit / Surface HUD** | Timeline Scrubber card completely covers Agent Audit Log toggle pill on mobile | **High** | `src/components/panels/Timeline.tsx` / `AgentDrawer.tsx` |
| **Orbit / Surface HUD** | Top Header wraps into 4 clunky tiers without hamburger or mobile layout | **High** | `src/components/panels/OrbitHud.tsx` / `SurfaceHud.tsx` |
| **Agent Drawer** | 3-column layout hardcoded (`1.2fr 1fr 1fr`), squashing columns to 100px on mobile | **High** | `src/components/panels/AgentDrawer.tsx` |
| **Validation Modal** | Table width (658px) overflows 342px modal container on mobile without clear scroll hints | **Medium** | `src/components/panels/ValidationModal.tsx` |
| **Orbit Scene** | Timeline card (760px) overlaps Agent Pill by 117px at 1024px tablet width | **Medium** | `src/components/panels/Timeline.tsx` |
| **Earth 3D** | Additive atmosphere glow on Earth violates invariant that only Sun glows | **Medium** | `src/three/Earth.tsx` |
| **Satellites 3D** | Satellites are unshaded generic boxes (`0.35` units) rendered with `meshBasicMaterial` | **Medium** | `src/three/Satellites.tsx` |
| **Alert Card** | `RESOLVED` chip contrast (4.35:1) fails WCAG AA; `FALSE_ALARM` chip lacks dedicated token | **Low** | `src/components/panels/AlertCard.tsx` |
| **Typography** | 10px monospace micro-type used across 11 labels strains readability | **Low** | `src/components/panels/*.tsx` |
| **Shelters 3D** | Habitat structures are primitive low-poly hemispheres with toy-like aesthetics | **Low** | `src/three/LunarShelters.tsx` |
| **Route Line** | WebGL clamps line width to 1px on Windows, causing aliased shimmering on terrain | **Low** | `src/three/RouteLine.tsx` |

---

## Top 10 UI Problems Ranked

1. **Alert Card & Forecast Bento Collision on Mobile (390px)**
   - *Problem:* Both panels are pinned to `top: 72px` with absolute positioning. On mobile, they occupy the exact same horizontal space, creating an unreadable mess of overlapping text.
   - *File:* `src/components/panels/AlertCard.tsx` & `src/components/panels/Forecast.tsx`
2. **Timeline Scrubber Buries Agent Audit Log Pill on Mobile (390px)**
   - *Problem:* Timeline scrubber card (`height: 195px; bottom: 20px`) sits directly on top of the Agent Audit Log pill (`bottom: 100px; left: 16px`), making the agent audit trail completely inaccessible.
   - *File:* `src/components/panels/Timeline.tsx` & `src/components/panels/AgentDrawer.tsx`
3. **Agent Audit Drawer Column Squashing on Mobile (390px)**
   - *Problem:* `gridTemplateColumns: '1.2fr 1fr 1fr'` forces 3 columns into 390px screen width. Columns measure ~100px wide, breaking execution traces, analogies, and citations.
   - *File:* `src/components/panels/AgentDrawer.tsx`
4. **Header Navigation Bar Fragmentation on Mobile (390px)**
   - *Problem:* A single flex row containing 6 buttons and a detailed mouse instruction hint wraps into 4 chaotic lines, consuming 130px of vertical space and clipping the top of panels.
   - *File:* `src/components/panels/OrbitHud.tsx` & `src/components/panels/SurfaceHud.tsx`
5. **Timeline Scrubber & Agent Pill Collision on Tablet (1024px)**
   - *Problem:* Timeline width of 760px at `left: 132px` collides with the Agent Pill (`right: 249px`), overlapping by 117 horizontal pixels.
   - *File:* `src/components/panels/Timeline.tsx`
6. **Earth Additive Atmospheric Glow Invariant Violation**
   - *Problem:* Earth mounts an additive blending sphere layer that creates an illuminated blue halo, violating the core rule that the Sun must be the only glowing celestial body.
   - *File:* `src/three/Earth.tsx`
7. **Satellites Rendered as Flat Unlit Primitives**
   - *Problem:* 120 satellites are represented by tiny generic `boxGeometry` cubes with `meshBasicMaterial`, lacking bus geometry, solar panels, or realistic shading.
   - *File:* `src/three/Satellites.tsx`
8. **Validation Modal Table Horizontal Overflow on Mobile**
   - *Problem:* A 5-column desktop table is rendered inside a modal on a 390px screen, overflowing by 315px without responsive card conversion or sticky columns.
   - *File:* `src/components/panels/ValidationModal.tsx`
9. **WCAG AA Contrast Failure on RESOLVED Status Chip**
   - *Problem:* RESOLVED chip pairs `#8B8F98` text with a 15% tinted surface background, producing a 4.35:1 contrast ratio (below the 4.5:1 minimum).
   - *File:* `src/components/panels/AlertCard.tsx`
10. **Extensive Use of 10px Monospace Micro-Typography**
    - *Problem:* Critical telemetry metadata (impact headings, rule names, evidence text, calibration notes) is set to 10px monospace, severely degrading readability on mobile.
    - *File:* `src/components/panels/AlertCard.tsx`, `Forecast.tsx`, `SatelliteHealth.tsx`, `DoseMeter.tsx`

---

## Best & Worst Visual Elements

### Three Things That Look Best
1. **The Procedural Sun with Dynamic Granulation Shader:**
   The multi-octave 3D simplex noise shader animating the solar surface alongside limb darkening and an additive amber corona produces an authentic, visually impressive solar body that anchors the 3D scene.
2. **Grazing Sunlight on the Lunar South Pole Terrain:**
   The low-angle directional light grazing the 128×128 LOLA DEM elevation grid casts authentic, stark lunar shadows into crater basins, beautifully highlighting the topography of Shackleton crater rim.
3. **Smooth GSAP Camera Flight from Orbit to Surface:**
   The 2.5s `power2.inOut` camera transition from LEO high orbit downward into the lunar south pole coordinates feels cinematic, steady, and technically seamless with zero dropped frames.

### Three Things That Look Worst
1. **Mobile Layout Overlaps at 390px Width:**
   The catastrophic stacking of the Alert Card, Forecast Panel, Timeline, and Agent Pill on mobile looks completely broken, making it look as though no responsive CSS was ever written.
2. **Primitive Geometric Satellite Boxes:**
   The instanced tiny unlit cubes representing 120 satellites look like crude placeholder markers from an early tech demo rather than spacecraft in an advanced defense network.
3. **Primitive Toy-Like Lunar Shelter Domes:**
   The low-poly segmented spheres and raw grey cylinders representing lunar outposts look cartoonish and stark against the detailed LOLA elevation terrain.

---

## Inventory of Placeholder & Synthetic Data

1. **Illustrative Dose Units (IDU):**
   - *Location:* `src/components/panels/DoseMeter.tsx` (lines 108, 125, 155, 191, 202)
   - *Observation:* The dose gauge and safety cap measure radiation in synthetic "IDU" rather than real physical units (e.g. mGy, mSv).
2. **Replay Dataset Label:**
   - *Location:* `public/replay/feb2022.json` (line 5)
   - *Observation:* Dataset explicitly contains `"label": "Illustrative"`, indicating simulated interpolation between NOAA observation checkpoints.
3. **Validation Benchmark "No Data" Placeholders:**
   - *Location:* `src/components/panels/ValidationModal.tsx` (lines 87–88)
   - *Observation:* "Thermospheric Nitric Oxide Cooling Flux" and "Mid-Latitude Ionospheric Total Electron Content Drop" display `"No data"`.
4. **Scenario Test Label on Lunar Mission:**
   - *Location:* `src/components/panels/ValidationModal.tsx` (lines 420–433)
   - *Observation:* All lunar rover routing and shelter allocation outcomes are explicitly categorized as `"Scenario test"`, distinguishing them from real historical ground truth.
5. **Precomputed Forecast Tag:**
   - *Location:* `src/components/panels/Forecast.tsx` (lines 105–112)
   - *Observation:* The forecast panel displays a badge reading "Precomputed" rather than "ONNX Calibrated" when replaying static JSON rows.
