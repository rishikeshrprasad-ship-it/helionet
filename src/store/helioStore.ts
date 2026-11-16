import { create } from 'zustand'
import type { AssetManifest } from '../hooks/useAsset'
import type { WorkerSatellite } from '../workers/simulation.worker'

/** Current application view/scene. */
export type AppScene = 'landing' | 'orbit' | 'surface' | 'about'

/** Space weather observation snapshot. */
export interface SpaceWeatherObs {
  xray: number
  p10: number
  kp: number
  dst: number
  vsw: number
  bz: number
}

/** Space weather forecast snapshot. */
export interface SpaceWeatherForecast {
  pFlare: number | null
  pProton: number
  pGeo: number
  leadH: number
}

/** Single row in space weather replay sequence. */
export interface ReplayRow {
  t: number
  obs: SpaceWeatherObs
  forecast: SpaceWeatherForecast
}

/** Complete replay dataset. */
export interface ReplayFile {
  event_id: string
  name: string
  label: string
  rows: ReplayRow[]
}

/** Constellation simulation metrics. */
export interface ConstellationState {
  satellites: WorkerSatellite[]
  activeLinks: [number, number][]
  reroutedPath: number[]
  nominalCount: number
  atRiskCount: number
  lostCount: number
  avgAltitudeKm: number
  isNetworkConnected: boolean
}

/** Shelter candidate on lunar south pole grid. */
export interface ShelterInfo {
  id: string
  name: string
  gridX: number
  gridY: number
  capacity: number
  status: 'nominal' | 'crowded' | 'full'
}

/** Lunar surface simulation state. */
export interface LunarSurfaceState {
  roverGridPos: [number, number]
  roverWorldPos: [number, number, number]
  roverProgress: number // 0 to 1
  cumulativeDose: number
  doseCap: number
  doseRate: number
  svf: number
  isSheltered: boolean
  targetShelterId: string
  shelters: ShelterInfo[]
  activeRoute: [number, number][]
}

/** Forecast probabilities and lead time. */
export interface ForecastState {
  pFlare: number | null
  pProton: number
  pGeo: number
  leadH: number
  isPrecomputed: boolean
  modelBadge?: 'ILLUSTRATIVE MODEL' | 'PRECOMPUTED' | 'ONNX MODEL'
  inferenceTimeMs?: number
}

/** Alert card payload and user response. */
export interface AlertState {
  visible: boolean
  status: 'IDLE' | 'WATCH' | 'CONFIRMED' | 'RESOLVED' | 'FALSE_ALARM'
  event: string
  probability: number
  leadTime: number
  impact: string
  recommendedAction: string
  ruleFired: string
  evidence: string
  userChoice: 'approved' | 'rejected' | null
}

/** Single step log in autonomous agent loop. */
export interface AgentStepLog {
  step: 'Observe' | 'Analyze' | 'Research' | 'Plan' | 'Act' | 'Confirm' | 'Report'
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  ms: number
}

/** Autonomous agent audit log state. */
export interface AgentLogState {
  drawerOpen: boolean
  steps: AgentStepLog[]
  analogs: Array<{ id: string; name: string; date: string; similarity: number; description: string; source?: string }>
  kbCitations: Array<{ title: string; summary: string; source: string; needs_verification?: boolean }>
}

/** Simulation playback state. */
export interface PlaybackState {
  playing: boolean
  speed: 1 | 10 | 60 | 240
  /** Current simulation time in hours (0 to 24+). */
  currentTimeHours: number
  /** Total duration in hours. */
  durationHours: number
}

export type SecondaryPanelId = 'forecast' | 'satellites' | 'dose' | 'key'
export type OrbitCameraPreset = 'overview' | 'constellation' | 'storm' | 'solarSystem'
export type InspectableEntity =
  | { kind: 'satellite'; id: number }
  | { kind: 'shelter'; id: string }
export type HoveredEntity = (InspectableEntity & { x: number; y: number }) | null
export type LoadStatus = 'loading' | 'ready' | 'error'

interface HelioStore {
  scene: AppScene
  manifest: AssetManifest
  playback: PlaybackState
  replay: ReplayFile | null
  activeRow: ReplayRow | null
  constellation: ConstellationState
  surface: LunarSurfaceState
  forecast: ForecastState
  alert: AlertState
  agentLog: AgentLogState
  openSecondaryPanel: SecondaryPanelId | null
  stormProgress: number // 0 to 1
  validationOpen: boolean
  validationEvent: string
  hudOpacity: number
  dataError: string | null
  replayStatus: LoadStatus
  agentCatalogStatus: LoadStatus
  reloadTrigger: number
  presentationMode: boolean
  tourOpen: boolean
  tourStep: number
  tourPaused: boolean
  orbitCameraPreset: OrbitCameraPreset
  orbitCameraSeq: number
  hoveredEntity: HoveredEntity
  selectedEntity: InspectableEntity | null
  shortcutsOpen: boolean

  setScene: (scene: AppScene) => void
  setHudOpacity: (opacity: number) => void
  setDataError: (error: string | null) => void
  setReplayStatus: (status: LoadStatus) => void
  setAgentCatalogStatus: (status: LoadStatus) => void
  triggerReplayReload: () => void
  setPresentationMode: (enabled: boolean) => void
  togglePresentationMode: () => void
  startTour: (step?: number) => void
  closeTour: () => void
  setTourStep: (step: number) => void
  setTourPaused: (paused: boolean) => void
  setOrbitCameraPreset: (preset: OrbitCameraPreset) => void
  setHoveredEntity: (entity: HoveredEntity) => void
  setSelectedEntity: (entity: InspectableEntity | null) => void
  setShortcutsOpen: (open: boolean) => void
  toggleShortcutsOpen: () => void
  transitionScene: (targetScene: AppScene, reducedMotion?: boolean) => void
  setManifest: (manifest: AssetManifest) => void
  setPlaying: (playing: boolean) => void
  setSpeed: (speed: PlaybackState['speed']) => void
  setCurrentTimeHours: (hours: number) => void
  setReplay: (replay: ReplayFile) => void
  setConstellation: (state: Partial<ConstellationState>) => void
  setSurface: (state: Partial<LunarSurfaceState>) => void
  setForecast: (state: Partial<ForecastState>) => void
  setAlert: (state: Partial<AlertState>) => void
  setAgentLog: (state: Partial<AgentLogState>) => void
  setOpenSecondaryPanel: (panel: SecondaryPanelId | null) => void
  toggleSecondaryPanel: (panel: SecondaryPanelId) => void
  setStormProgress: (progress: number) => void
  setValidationOpen: (open: boolean) => void
  setValidationEvent: (event: string) => void
}

const DEFAULT_SHELTERS: ShelterInfo[] = [
  { id: 'alpha', name: 'Shelter A', gridX: 42, gridY: 38, capacity: 4, status: 'nominal' },
  { id: 'beta',  name: 'Shelter B', gridX: 92, gridY: 54, capacity: 3, status: 'nominal' },
  { id: 'gamma', name: 'Shelter C', gridX: 64, gridY: 96, capacity: 6, status: 'nominal' },
]

const DEFAULT_SURFACE: LunarSurfaceState = {
  roverGridPos: [20, 24],
  roverWorldPos: [0, 0, 0],
  roverProgress: 0,
  cumulativeDose: 0,
  doseCap: 50.0,
  doseRate: 0.12,
  svf: 0.85,
  isSheltered: false,
  targetShelterId: 'alpha',
  shelters: DEFAULT_SHELTERS,
  activeRoute: [],
}

const DEFAULT_CONSTELLATION: ConstellationState = {
  satellites: [],
  activeLinks: [],
  reroutedPath: [],
  nominalCount: 80,
  atRiskCount: 40,
  lostCount: 0,
  avgAltitudeKm: 436.7,
  isNetworkConnected: true,
}

const DEFAULT_FORECAST: ForecastState = {
  pFlare: 0.22,
  pProton: 0.08,
  pGeo: 0.35,
  leadH: 24.0,
  isPrecomputed: true,
}

const DEFAULT_ALERT: AlertState = {
  visible: true,
  status: 'WATCH',
  event: 'Feb 2022 storm (illustrative replay)',
  probability: 0.86,
  leadTime: 18.0,
  impact: 'LEO Atmospheric Drag Surge; Satellites at 210 km fail to raise orbit',
  recommendedAction: 'Boost LEO satellites & switch to safe mode; activate secondary mesh routes',
  ruleFired: 'Geomagnetic LEO drag (pGeo >= 50% & Kp >= 5)',
  evidence: 'NOAA SWPC Forecast pGeo = 86%, Observed Kp = 5.3 >= 5.0 (G1 Storm)',
  userChoice: null,
}

const DEFAULT_AGENT_LOG: AgentLogState = {
  drawerOpen: false,
  steps: [],
  analogs: [],
  kbCitations: [],
}

let fadeOutTimer: ReturnType<typeof setTimeout> | null = null
let fadeInTimer: ReturnType<typeof setTimeout> | null = null

export const useHelioStore = create<HelioStore>((set, get) => ({
  scene: 'landing',
  manifest: {},
  playback: {
    playing: false,
    speed: 1,
    currentTimeHours: 0,
    durationHours: 24,
  },
  replay: null,
  activeRow: null,
  constellation: DEFAULT_CONSTELLATION,
  surface: DEFAULT_SURFACE,
  forecast: DEFAULT_FORECAST,
  alert: DEFAULT_ALERT,
  agentLog: DEFAULT_AGENT_LOG,
  openSecondaryPanel: null,
  stormProgress: 0,
  hudOpacity: 1.0,
  dataError: null,
  replayStatus: 'loading',
  agentCatalogStatus: 'loading',
  reloadTrigger: 0,
  presentationMode: false,
  tourOpen: false,
  tourStep: 0,
  tourPaused: false,
  orbitCameraPreset: 'overview',
  orbitCameraSeq: 0,
  hoveredEntity: null,
  selectedEntity: null,
  shortcutsOpen: false,

  setDataError: (dataError) => set({ dataError }),
  setReplayStatus: (replayStatus) => set({ replayStatus }),
  setAgentCatalogStatus: (agentCatalogStatus) => set({ agentCatalogStatus }),
  triggerReplayReload: () => set((s) => ({ replayStatus: 'loading', dataError: null, reloadTrigger: s.reloadTrigger + 1 })),
  setPresentationMode: (presentationMode) =>
    set((s) => ({
      presentationMode,
      openSecondaryPanel: presentationMode ? null : s.openSecondaryPanel,
      agentLog: presentationMode ? { ...s.agentLog, drawerOpen: false } : s.agentLog,
      hoveredEntity: presentationMode ? null : s.hoveredEntity,
      selectedEntity: presentationMode ? null : s.selectedEntity,
    })),
  togglePresentationMode: () =>
    set((s) => {
      const next = !s.presentationMode
      return {
        presentationMode: next,
        openSecondaryPanel: next ? null : s.openSecondaryPanel,
        agentLog: next ? { ...s.agentLog, drawerOpen: false } : s.agentLog,
        hoveredEntity: next ? null : s.hoveredEntity,
        selectedEntity: next ? null : s.selectedEntity,
      }
    }),
  startTour: (step = 0) =>
    set((s) => ({
      tourOpen: true,
      tourStep: Math.max(0, Math.min(6, step)),
      tourPaused: false,
      shortcutsOpen: false,
      hoveredEntity: null,
      playback: { ...s.playback, playing: false },
    })),
  closeTour: () => set({ tourOpen: false, tourPaused: false }),
  setTourStep: (tourStep) => set({ tourStep: Math.max(0, Math.min(6, tourStep)) }),
  setTourPaused: (tourPaused) => set({ tourPaused }),
  setOrbitCameraPreset: (orbitCameraPreset) =>
    set((s) => ({ orbitCameraPreset, orbitCameraSeq: s.orbitCameraSeq + 1 })),
  setHoveredEntity: (hoveredEntity) => set({ hoveredEntity }),
  setSelectedEntity: (selectedEntity) => set({ selectedEntity }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  toggleShortcutsOpen: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
  setHudOpacity: (hudOpacity) => set({ hudOpacity }),

  setScene: (scene) => set({ scene, hoveredEntity: null, selectedEntity: null }),

  transitionScene: (targetScene, reducedMotion = false) => {
    const current = get().scene
    if (current === targetScene) return

    if (fadeOutTimer) clearTimeout(fadeOutTimer)
    if (fadeInTimer) clearTimeout(fadeInTimer)

    // Reduced motion: 150ms crossfade with no camera flight
    if (reducedMotion) {
      set({ hudOpacity: 0.0 })
      fadeOutTimer = setTimeout(() => {
        set({ scene: targetScene, hoveredEntity: null, selectedEntity: null })
        fadeInTimer = setTimeout(() => {
          set({ hudOpacity: 1.0 })
        }, 20)
      }, 75)
      return
    }

    // 1. Fade HUD out in 150ms before the move
    set({ hudOpacity: 0.0 })

    fadeOutTimer = setTimeout(() => {
      // 2. Switch scene after 150ms fade-out
      set({ scene: targetScene, hoveredEntity: null, selectedEntity: null })

      // If switching to surface, SurfaceScene camera flight (1.8s) will fade HUD in over 220ms after arrival
      if (targetScene !== 'surface') {
        fadeInTimer = setTimeout(() => {
          set({ hudOpacity: 1.0 })
        }, 30)
      }
    }, 150)
  },

  setManifest: (manifest) => set({ manifest }),

  setPlaying: (playing) =>
    set((s) => ({ playback: { ...s.playback, playing } })),

  setSpeed: (speed) =>
    set((s) => ({ playback: { ...s.playback, speed } })),

  setCurrentTimeHours: (currentTimeHours) =>
    set((s) => {
      let activeRow: ReplayRow | null = s.activeRow
      let forecast = s.forecast
      let alert = s.alert
      // If user rewinds back to the very start, reset userChoice so the replay can be run again cleanly
      if (currentTimeHours <= 0.2 && s.alert.userChoice !== null) {
        alert = { ...s.alert, userChoice: null }
      }
      if (s.replay && s.replay.rows.length > 0) {
        const clampedIndex = Math.min(
          Math.max(0, Math.floor(currentTimeHours)),
          s.replay.rows.length - 1,
        )
        const nextActiveRow = s.replay.rows[clampedIndex] ?? null
        if (nextActiveRow !== s.activeRow) {
          activeRow = nextActiveRow
          if (activeRow) {
            forecast = {
              pFlare: activeRow.forecast.pFlare,
              pProton: activeRow.forecast.pProton,
              pGeo: activeRow.forecast.pGeo,
              leadH: activeRow.forecast.leadH,
              isPrecomputed: true,
            }
          }
        }
      }
      return {
        playback: { ...s.playback, currentTimeHours },
        activeRow,
        forecast,
        alert,
      }
    }),

  setReplay: (replay) => {
    const durationHours = replay.rows.length > 0 ? replay.rows[replay.rows.length - 1].t : 24
    const firstRow = replay.rows[0] ?? null
    set((s) => ({
      replay,
      replayStatus: 'ready',
      activeRow: firstRow,
      playback: { ...s.playback, durationHours },
    }))
  },

  setConstellation: (partial) =>
    set((s) => ({
      constellation: { ...s.constellation, ...partial },
    })),

  setSurface: (partial) =>
    set((s) => ({
      surface: { ...s.surface, ...partial },
    })),

  setForecast: (partial) =>
    set((s) => ({
      forecast: { ...s.forecast, ...partial },
    })),

  setAlert: (partial) =>
    set((s) => ({
      alert: { ...s.alert, ...partial },
    })),

  setAgentLog: (partial) =>
    set((s) => ({
      agentLog: { ...s.agentLog, ...partial },
      openSecondaryPanel: partial.drawerOpen ? null : s.openSecondaryPanel,
    })),

  setOpenSecondaryPanel: (panel) =>
    set((s) => ({
      openSecondaryPanel: panel,
      agentLog: panel ? { ...s.agentLog, drawerOpen: false } : s.agentLog,
    })),

  toggleSecondaryPanel: (panel) =>
    set((s) => {
      const next = s.openSecondaryPanel === panel ? null : panel
      return {
        openSecondaryPanel: next,
        agentLog: next ? { ...s.agentLog, drawerOpen: false } : s.agentLog,
      }
    }),

  setStormProgress: (stormProgress) => set({ stormProgress }),

  validationOpen: false,
  validationEvent: 'feb2022',
  setValidationOpen: (validationOpen) => set({ validationOpen }),
  setValidationEvent: (validationEvent) => set({ validationEvent }),
}))

if (typeof window !== 'undefined') {
  ;(window as unknown as { __HELIO_STORE__: typeof useHelioStore }).__HELIO_STORE__ = useHelioStore
}


