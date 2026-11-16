import React, { useEffect } from 'react'
import { useHelioStore, type OrbitCameraPreset, type SecondaryPanelId } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { TOKENS } from '../../tokens'

interface TourStepDef {
  id: string
  title: string
  caption: string
  timeHours: number
  targetScene: 'orbit' | 'surface'
  secondaryPanel: SecondaryPanelId | null
  cameraPreset?: OrbitCameraPreset
}

const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'watch',
    title: 'Forecast rises (Watch)',
    caption: 'Geomagnetic probability crosses the 50% threshold ahead of storm arrival, raising a Watch alert.',
    timeHours: 4,
    targetScene: 'orbit',
    secondaryPanel: 'forecast',
    cameraPreset: 'overview',
  },
  {
    id: 'confirm',
    title: 'Observation confirms',
    caption: 'Observed Kp climbs to 5.3 (G1 storm), confirming an active geomagnetic event.',
    timeHours: 7,
    targetScene: 'orbit',
    secondaryPanel: null,
    cameraPreset: 'overview',
  },
  {
    id: 'decay',
    title: 'Satellites decay',
    caption: 'Upper-atmosphere heating increases drag at low altitude; affected satellites shift from grey to amber and red-orange.',
    timeHours: 10,
    targetScene: 'orbit',
    secondaryPanel: 'satellites',
    cameraPreset: 'constellation',
  },
  {
    id: 'reroute',
    title: 'Network reroutes',
    caption: 'Broken links fade out and traffic reroutes along the highlighted slate-blue backup path.',
    timeHours: 12,
    targetScene: 'orbit',
    secondaryPanel: 'satellites',
    cameraPreset: 'constellation',
  },
  {
    id: 'moon',
    title: 'Go to the Moon',
    caption: 'Rising solar proton flux puts lunar surface traverses at risk. The camera flies to the lunar south pole.',
    timeHours: 12,
    targetScene: 'surface',
    secondaryPanel: 'dose',
  },
  {
    id: 'shelter',
    title: 'Rover reaches shelter',
    caption: 'Rover 01 follows the lowest-exposure ivory route into Shelter A to limit crew radiation dose.',
    timeHours: 23,
    targetScene: 'surface',
    secondaryPanel: 'dose',
  },
  {
    id: 'decision',
    title: 'Approve or reject',
    caption: 'Review the recommended action in the alert card and choose Approve action or Reject.',
    timeHours: 23,
    targetScene: 'surface',
    secondaryPanel: null,
  },
]

const STEP_DURATION_MS = 5500

/**
 * 7-step guided tour with pausable, skippable, keyboard-accessible captions.
 * Stays visible in Presentation mode with scaled typography.
 */
export function GuidedTour(): React.ReactElement | null {
  const tourOpen = useHelioStore((s) => s.tourOpen)
  const tourStep = useHelioStore((s) => s.tourStep)
  const tourPaused = useHelioStore((s) => s.tourPaused)
  const scene = useHelioStore((s) => s.scene)
  const presentationMode = useHelioStore((s) => s.presentationMode)

  const setTourStep = useHelioStore((s) => s.setTourStep)
  const setTourPaused = useHelioStore((s) => s.setTourPaused)
  const closeTour = useHelioStore((s) => s.closeTour)
  const setPlaying = useHelioStore((s) => s.setPlaying)
  const setCurrentTimeHours = useHelioStore((s) => s.setCurrentTimeHours)
  const setOpenSecondaryPanel = useHelioStore((s) => s.setOpenSecondaryPanel)
  const setOrbitCameraPreset = useHelioStore((s) => s.setOrbitCameraPreset)
  const transitionScene = useHelioStore((s) => s.transitionScene)

  const reducedMotion = useReducedMotion()
  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'

  const stepDef = TOUR_STEPS[tourStep] ?? TOUR_STEPS[0]

  // Apply the active step's scene, time, camera preset, and panel focus
  useEffect(() => {
    if (!tourOpen || !stepDef) return

    setPlaying(false)
    setCurrentTimeHours(stepDef.timeHours)
    setOpenSecondaryPanel(presentationMode ? null : stepDef.secondaryPanel)

    if (scene !== stepDef.targetScene && (scene === 'orbit' || scene === 'surface')) {
      transitionScene(stepDef.targetScene, reducedMotion)
    }

    if (stepDef.targetScene === 'orbit' && stepDef.cameraPreset) {
      setOrbitCameraPreset(stepDef.cameraPreset)
    }
  }, [
    tourOpen,
    tourStep,
    stepDef,
    scene,
    presentationMode,
    reducedMotion,
    setPlaying,
    setCurrentTimeHours,
    setOpenSecondaryPanel,
    setOrbitCameraPreset,
    transitionScene,
  ])

  // Auto-advance to next step unless paused or on final decision step
  useEffect(() => {
    if (!tourOpen || tourPaused || tourStep >= TOUR_STEPS.length - 1) return
    const timer = window.setTimeout(() => {
      setTourStep(tourStep + 1)
    }, STEP_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [tourOpen, tourPaused, tourStep, setTourStep])

  if (!tourOpen || (scene !== 'orbit' && scene !== 'surface')) {
    return null
  }

  const isFirst = tourStep === 0
  const isLast = tourStep === TOUR_STEPS.length - 1

  const titleSize = presentationMode ? '22px' : '16px'
  const captionSize = presentationMode ? '18px' : '14px'
  const controlMinHeight = isPhone ? '44px' : '34px'

  return (
    <section
      role="region"
      aria-label="Guided tour captions"
      aria-live="polite"
      data-testid="guided-tour"
      style={{
        position: 'absolute',
        ...(isPhone
          ? {
              top: '56px',
              left: '16px',
              right: '16px',
            }
          : {
              bottom: '104px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: presentationMode ? 'min(640px, calc(100vw - 48px))' : 'min(520px, calc(100vw - 48px))',
            }),
        background: TOKENS.panel.background,
        border: TOKENS.panel.border,
        borderRadius: TOKENS.panel.borderRadius,
        padding: presentationMode ? '20px' : TOKENS.panel.padding,
        color: TOKENS.color.text,
        fontFamily: TOKENS.font.sans,
        lineHeight: 1.4,
        zIndex: 36,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        transition: reducedMotion ? 'none' : `opacity ${TOKENS.transition.base}, transform ${TOKENS.transition.base}`,
      }}
    >
      {/* Header row: step counter & title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            className="tabular"
            style={{
              fontFamily: TOKENS.font.mono,
              fontSize: presentationMode ? '14px' : '12px',
              color: TOKENS.color.slateBlue,
              fontWeight: 500,
            }}
          >
            Step {tourStep + 1} / {TOUR_STEPS.length}
          </span>
          <h3
            style={{
              margin: 0,
              fontFamily: TOKENS.font.heading,
              fontSize: titleSize,
              fontWeight: 600,
              lineHeight: 1.15,
              color: TOKENS.color.text,
            }}
          >
            {stepDef.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={closeTour}
          aria-label="Skip guided tour"
          style={{
            minHeight: controlMinHeight,
            padding: '0 8px',
            background: 'transparent',
            border: 'none',
            color: TOKENS.color.muted,
            fontFamily: TOKENS.font.sans,
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: `color ${TOKENS.transition.fast}`,
          }}
        >
          Skip
        </button>
      </div>

      {/* Caption body */}
      <p
        style={{
          margin: 0,
          fontFamily: TOKENS.font.sans,
          fontSize: captionSize,
          lineHeight: 1.45,
          color: TOKENS.color.text,
        }}
      >
        {stepDef.caption}
      </p>

      {/* Progress dots + keyboard-accessible navigation buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
          borderTop: `1px solid ${TOKENS.color.hairline}`,
          paddingTop: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} aria-hidden="true">
          {TOUR_STEPS.map((s, idx) => (
            <span
              key={s.id}
              style={{
                display: 'inline-block',
                width: idx === tourStep ? '18px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: idx === tourStep ? TOKENS.color.text : TOKENS.color.hairline,
                transition: `width ${TOKENS.transition.fast}, background-color ${TOKENS.transition.fast}`,
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setTourStep(tourStep - 1)}
            aria-label="Previous tour step"
            style={{
              minHeight: controlMinHeight,
              padding: '0 10px',
              background: 'transparent',
              border: TOKENS.border.hairline,
              borderRadius: '6px',
              color: isFirst ? TOKENS.color.muted : TOKENS.color.text,
              opacity: isFirst ? 0.45 : 1,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              cursor: isFirst ? 'not-allowed' : 'pointer',
              transition: `border-color ${TOKENS.transition.fast}, opacity ${TOKENS.transition.fast}`,
            }}
          >
            ← Prev
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={() => setTourPaused(!tourPaused)}
              aria-label={tourPaused ? 'Resume tour' : 'Pause tour'}
              style={{
                minHeight: controlMinHeight,
                padding: '0 10px',
                background: 'transparent',
                border: TOKENS.border.hairline,
                borderRadius: '6px',
                color: TOKENS.color.text,
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: `border-color ${TOKENS.transition.fast}`,
              }}
            >
              {tourPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                closeTour()
              } else {
                setTourStep(tourStep + 1)
              }
            }}
            aria-label={isLast ? 'Finish guided tour' : 'Next tour step'}
            style={{
              minHeight: controlMinHeight,
              padding: '0 14px',
              background: TOKENS.color.text,
              border: 'none',
              borderRadius: '6px',
              color: TOKENS.color.background,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: `opacity ${TOKENS.transition.fast}`,
            }}
          >
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </section>
  )
}
