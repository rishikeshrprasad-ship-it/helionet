import React, { useEffect, useState, Suspense } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { NoWebGL, isWebGLAvailable } from '../components/NoWebGL'
import { LoadingScreen } from '../components/LoadingScreen'
import { Landing } from './Landing'
import { About } from './About'
import { OrbitScene } from '../scenes/OrbitScene'
import { OrbitHud } from '../components/panels/OrbitHud'
import { SatelliteHealth } from '../components/panels/SatelliteHealth'
import { DoseMeter } from '../components/panels/DoseMeter'
import { Forecast } from '../components/panels/Forecast'
import { AlertCard } from '../components/panels/AlertCard'
import { AgentDrawer } from '../components/panels/AgentDrawer'
import { SurfaceHud } from '../components/panels/SurfaceHud'
import { Timeline } from '../components/panels/Timeline'
import { ValidationModal } from '../components/panels/ValidationModal'
import { GuidedTour } from '../components/panels/GuidedTour'
import { SceneLegend } from '../components/panels/SceneLegend'
import { CameraPresets } from '../components/panels/CameraPresets'
import { ObjectInspector } from '../components/panels/ObjectInspector'
import { ShortcutsModal } from '../components/panels/ShortcutsModal'
import { AlertLiveRegion } from '../components/AlertLiveRegion'
import { satelliteSelection } from '../three/satelliteSelection'
import {
  PhoneBottomSheet,
  type BottomSheetSnap,
  type BottomSheetTab,
} from '../components/panels/PhoneBottomSheet'
import { useHelioStore } from '../store/helioStore'
import { TOKENS } from '../tokens'
import { loadManifest } from '../hooks/useAsset'
import { useSimulationWorker } from '../hooks/useSimulationWorker'
import { useAgentLoop } from '../hooks/useAgentLoop'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useReducedMotion } from '../hooks/useReducedMotion'

// Lazy-load Surface scene as required by specification
const SurfaceScene = React.lazy(() =>
  import('../scenes/SurfaceScene').then((m) => ({ default: m.SurfaceScene })),
)

/**
 * Root application component.
 * - Checks WebGL availability before mounting 3D content (supports ?nowebgl=1 fallback).
 * - Renders 3D Canvas with error boundary.
 * - Responsive HUD layout per breakpoint:
 *   - Phone (<768px): 48px header + Bottom Sheet with tabs [Alert, Forecast, Satellites/Dose, Agent]
 *   - Tablet (768-1199px): Single stacked right column (max 300px), centered Timeline, header Agent pill
 *   - Desktop (>=1200px): Standard multi-panel layout
 */
export function App(): React.ReactElement {
  const breakpoint = useBreakpoint()
  const reducedMotion = useReducedMotion()
  const scene = useHelioStore((s) => s.scene)
  const setScene = useHelioStore((s) => s.setScene)
  const transitionScene = useHelioStore((s) => s.transitionScene)
  const setManifest = useHelioStore((s) => s.setManifest)
  const hudOpacity = useHelioStore((s) => s.hudOpacity)
  const dataError = useHelioStore((s) => s.dataError)
  const setDataError = useHelioStore((s) => s.setDataError)
  const replayStatus = useHelioStore((s) => s.replayStatus)
  const triggerReplayReload = useHelioStore((s) => s.triggerReplayReload)
  const presentationMode = useHelioStore((s) => s.presentationMode)
  const setPresentationMode = useHelioStore((s) => s.setPresentationMode)
  const togglePresentationMode = useHelioStore((s) => s.togglePresentationMode)
  const tourOpen = useHelioStore((s) => s.tourOpen)
  const startTour = useHelioStore((s) => s.startTour)
  const closeTour = useHelioStore((s) => s.closeTour)
  const shortcutsOpen = useHelioStore((s) => s.shortcutsOpen)
  const setShortcutsOpen = useHelioStore((s) => s.setShortcutsOpen)
  const toggleShortcutsOpen = useHelioStore((s) => s.toggleShortcutsOpen)
  const selectedEntity = useHelioStore((s) => s.selectedEntity)
  const setSelectedEntity = useHelioStore((s) => s.setSelectedEntity)
  const [loading, setLoading] = useState<boolean>(true)
  const [loadProgress, setLoadProgress] = useState<number>(0.25)
  const [loadingStepLabel, setLoadingStepLabel] = useState<string>('Starting engines')

  // Phone bottom sheet state
  const [phoneSnap, setPhoneSnap] = useState<BottomSheetSnap>('peek')
  const [phoneTab, setPhoneTab] = useState<BottomSheetTab>('alert')

  // Initialize simulation Web Worker & timeline runner
  useSimulationWorker()
  // Initialize autonomous Agent loop (7-phase cycle)
  useAgentLoop()

  // Route listener for /about
  useEffect(() => {
    const checkRoute = () => {
      if (window.location.pathname === '/about') {
        setScene('about')
      }
    }
    checkRoute()
    window.addEventListener('popstate', checkRoute)
    return () => window.removeEventListener('popstate', checkRoute)
  }, [setScene])

  // Global keyboard shortcuts: T (guided tour), P (presentation mode), ? (shortcut list), Esc (layered dismiss)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return
      }

      if (e.key === '?' && (scene === 'orbit' || scene === 'surface')) {
        e.preventDefault()
        toggleShortcutsOpen()
      } else if ((e.key === 'p' || e.key === 'P') && (scene === 'orbit' || scene === 'surface')) {
        e.preventDefault()
        togglePresentationMode()
      } else if ((e.key === 't' || e.key === 'T') && scene !== 'about') {
        e.preventDefault()
        if (tourOpen) {
          closeTour()
        } else {
          if (scene === 'landing') {
            transitionScene('orbit', reducedMotion)
          }
          startTour(0)
        }
      } else if (e.key === 'Escape') {
        if (shortcutsOpen) {
          setShortcutsOpen(false)
        } else if (tourOpen) {
          closeTour()
        } else if (presentationMode) {
          setPresentationMode(false)
        } else if (selectedEntity) {
          satelliteSelection.selectedId = null
          setSelectedEntity(null)
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [
    scene,
    tourOpen,
    shortcutsOpen,
    presentationMode,
    selectedEntity,
    reducedMotion,
    toggleShortcutsOpen,
    togglePresentationMode,
    startTour,
    closeTour,
    transitionScene,
    setShortcutsOpen,
    setPresentationMode,
    setSelectedEntity,
  ])

  // Sync presentation attribute on root element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.presentation = presentationMode ? 'true' : 'false'
    }
  }, [presentationMode])

  useEffect(() => {
    let mounted = true
    const startTime = performance.now()

    const timer1 = setTimeout(() => {
      if (!mounted) return
      // Phase 2: Loading scene
      setLoadingStepLabel('Loading scene')
      setLoadProgress(0.70)
    }, 220)

    loadManifest()
      .then((manifest) => {
        if (!mounted) return
        setManifest(manifest)
      })
      .catch(() => {})
      .finally(() => {
        const timer2 = setTimeout(() => {
          if (!mounted) return
          // Phase 3: Ready
          setLoadingStepLabel('Ready')
          setLoadProgress(1.0)

          const elapsed = performance.now() - startTime
          // Show loading screen for at least 650ms (strictly >= 600ms per requirement)
          const remaining = Math.max(160, 650 - elapsed)
          const timer3 = setTimeout(() => {
            if (mounted) setLoading(false)
          }, remaining)
          return () => clearTimeout(timer3)
        }, 440)
        return () => clearTimeout(timer2)
      })

    return () => {
      mounted = false
      clearTimeout(timer1)
    }
  }, [setManifest])

  // WebGL 2 capability check (supports ?nowebgl=1 2D plain-HTML fallback)
  if (!isWebGLAvailable()) {
    return <NoWebGL />
  }

  return (
    <ErrorBoundary label="Application Root">
      <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}>
        {dataError && (
          <div
            role="alert"
            data-testid="data-error-banner"
            style={{
              position: 'fixed',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: TOKENS.color.surface,
              color: TOKENS.color.redOrange,
              padding: '10px 18px',
              borderRadius: '6px',
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: `1px solid ${TOKENS.color.redOrange}`,
              maxWidth: '90vw',
            }}
          >
            <span aria-hidden="true">⚠️</span>
            <span>{dataError}</span>
            {replayStatus === 'error' && (
              <button
                type="button"
                onClick={triggerReplayReload}
                style={{
                  background: TOKENS.color.text,
                  border: 'none',
                  borderRadius: '4px',
                  color: TOKENS.color.background,
                  cursor: 'pointer',
                  fontFamily: TOKENS.font.sans,
                  fontWeight: 500,
                  fontSize: '14px',
                  minHeight: breakpoint === 'phone' ? '44px' : '32px',
                  padding: '4px 10px',
                }}
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => setDataError(null)}
              aria-label="Dismiss error"
              style={{
                background: 'transparent',
                border: 'none',
                color: TOKENS.color.text,
                cursor: 'pointer',
                fontFamily: TOKENS.font.sans,
                fontWeight: 500,
                fontSize: '14px',
                minWidth: breakpoint === 'phone' ? '44px' : '32px',
                minHeight: breakpoint === 'phone' ? '44px' : '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        )}
        {loading && (
          <LoadingScreen progress={loadProgress} label={loadingStepLabel} />
        )}

        {/* 3D Scene Background Canvas */}
        {(scene === 'landing' || scene === 'orbit') && (
          <Suspense fallback={<LoadingScreen progress={0.8} label="Loading scene" />}>
            <ErrorBoundary label="3D Orbit Scene">
              <OrbitScene interactive={scene === 'orbit'} />
            </ErrorBoundary>
          </Suspense>
        )}

        {scene === 'surface' && (
          <Suspense fallback={<LoadingScreen progress={0.9} label="Loading scene" />}>
            <ErrorBoundary label="3D Lunar Surface Scene">
              <SurfaceScene />
            </ErrorBoundary>
          </Suspense>
        )}

        {/* UI Overlays: Landing */}
        {scene === 'landing' && (
          <ErrorBoundary label="Landing Overlay">
            <Landing />
          </ErrorBoundary>
        )}

        {/* UI Overlays: Orbit & Surface Scenes (150ms fade-out before move, 220ms fade-in after move, or 150ms crossfade on reduced motion) */}
        {(scene === 'orbit' || scene === 'surface') && (
          <div
            data-testid="hud-transition-overlay"
            style={{
              opacity: hudOpacity,
              transition: reducedMotion
                ? `opacity ${TOKENS.transition.reduced}`
                : hudOpacity > 0.5
                  ? `opacity ${TOKENS.transition.base}`
                  : 'opacity 150ms cubic-bezier(0.5, 0, 0.75, 0)',
              pointerEvents: hudOpacity < 0.1 ? 'none' : 'auto',
            }}
          >
            {/* 1. Header Bar */}
            <ErrorBoundary label={scene === 'orbit' ? 'Orbit HUD' : 'Surface HUD'}>
              {scene === 'orbit' ? <OrbitHud /> : <SurfaceHud />}
            </ErrorBoundary>

            {/* Camera preset selector (Orbit scene only, hidden in Presentation mode) */}
            <ErrorBoundary label="Camera Presets">
              <CameraPresets />
            </ErrorBoundary>

            {/* Click Inspector & Hover Tooltip */}
            <ErrorBoundary label="Object Inspector">
              <ObjectInspector />
            </ErrorBoundary>

            {/* Guided Tour Captions (stays visible in Presentation mode) */}
            <ErrorBoundary label="Guided Tour">
              <GuidedTour />
            </ErrorBoundary>

            {/* 2. Phone View Layout (<768px): Bottom Sheet with tabs + Compact Timeline (or clean Alert + Timeline in Presentation mode) */}
            {breakpoint === 'phone' && (
              presentationMode ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: '56px',
                      left: '16px',
                      right: '16px',
                      zIndex: 25,
                      maxHeight: '55dvh',
                      overflowY: 'auto',
                    }}
                  >
                    <ErrorBoundary label="Alert Card">
                      <AlertCard containerMode />
                    </ErrorBoundary>
                  </div>
                  <ErrorBoundary label="Timeline Scrubber">
                    <Timeline sheetSnap="hidden" />
                  </ErrorBoundary>
                </>
              ) : (
                <>
                  <ErrorBoundary label="Timeline Scrubber">
                    <Timeline sheetSnap={phoneSnap} />
                  </ErrorBoundary>

                  <ErrorBoundary label="Phone Bottom Sheet">
                    <PhoneBottomSheet
                      scene={scene}
                      snap={phoneSnap}
                      onSnapChange={setPhoneSnap}
                      activeTab={phoneTab}
                      onTabChange={setPhoneTab}
                    />
                  </ErrorBoundary>
                </>
              )
            )}

            {/* 3. Tablet View Layout (768-1199px): Single Right Column Stack + Timeline + Agent Drawer */}
            {breakpoint === 'tablet' && (
              <>
                {/* Single stacked right column (320px) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '80px',
                    right: '24px',
                    bottom: '80px',
                    width: '320px',
                    maxWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    zIndex: 20,
                    overflowY: 'auto',
                    pointerEvents: 'auto',
                  }}
                >
                  <ErrorBoundary label="Alert Card">
                    <AlertCard containerMode />
                  </ErrorBoundary>

                  {!presentationMode && (
                    <>
                      <ErrorBoundary label="Forecast Bento">
                        <Forecast containerMode />
                      </ErrorBoundary>

                      <ErrorBoundary label={scene === 'orbit' ? 'Satellite Health' : 'Dose Meter'}>
                        {scene === 'orbit' ? (
                          <SatelliteHealth containerMode />
                        ) : (
                          <DoseMeter containerMode />
                        )}
                      </ErrorBoundary>

                      <SceneLegend containerMode />
                    </>
                  )}
                </div>

                {/* Timeline centered */}
                <ErrorBoundary label="Timeline Scrubber">
                  <Timeline />
                </ErrorBoundary>

                {!presentationMode && (
                  <ErrorBoundary label="Agent Audit Drawer">
                    <AgentDrawer />
                  </ErrorBoundary>
                )}
              </>
            )}

            {/* 4. Desktop View Layout (>=1200px): 24px margins, 340px left rail, 320px right rail */}
            {breakpoint === 'desktop' && (
              <>
                <ErrorBoundary label="Space Weather Alert Card">
                  <AlertCard />
                </ErrorBoundary>

                {!presentationMode && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '80px',
                      right: '24px',
                      width: '320px',
                      maxHeight: 'calc(100dvh - 128px)',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      zIndex: 20,
                      pointerEvents: 'auto',
                    }}
                  >
                    <ErrorBoundary label="Forecast Bento">
                      <Forecast containerMode />
                    </ErrorBoundary>

                    <ErrorBoundary label={scene === 'orbit' ? 'Satellite Health' : 'Dose Meter'}>
                      {scene === 'orbit' ? (
                        <SatelliteHealth containerMode />
                      ) : (
                        <DoseMeter containerMode />
                      )}
                    </ErrorBoundary>

                    <SceneLegend containerMode />
                  </div>
                )}

                <ErrorBoundary label="Timeline Scrubber">
                  <Timeline />
                </ErrorBoundary>

                {!presentationMode && (
                  <ErrorBoundary label="Agent Audit Drawer">
                    <AgentDrawer />
                  </ErrorBoundary>
                )}
              </>
            )}

            <AlertLiveRegion />
          </div>
        )}

        {/* /about Dedicated Page Overlay */}
        {scene === 'about' && (
          <ErrorBoundary label="About Page Overlay">
            <About />
          </ErrorBoundary>
        )}

        {/* Keyboard Shortcuts Dialog */}
        <ErrorBoundary label="Keyboard Shortcuts Modal">
          <ShortcutsModal />
        </ErrorBoundary>

        {/* Validation Benchmark Side-by-Side Modal (Feature 33) */}
        <ErrorBoundary label="Validation Benchmark Modal">
          <ValidationModal />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}
