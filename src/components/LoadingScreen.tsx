import React from 'react'
import { TOKENS } from '../tokens'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface LoadingScreenProps {
  /** 0–1 progress fraction */
  progress: number
  label?: string
}

/**
 * Full-screen loading overlay shown while the 3D scene and assets
 * are being prepared. Shows real progress (Suspense + asset loader).
 * Displays step labels: Starting engines -> Loading scene -> Ready
 * with a 4px progress bar and respects prefers-reduced-motion.
 */
export function LoadingScreen({ progress, label = 'Starting engines' }: LoadingScreenProps): React.ReactElement {
  const reducedMotion = useReducedMotion()
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100)

  // Map progress fraction to canonical step label if default label is used
  let stepLabel = label
  if (label === 'Loading…' || label.startsWith('Initializing')) {
    if (pct < 40) {
      stepLabel = 'Starting engines'
    } else if (pct < 90) {
      stepLabel = 'Loading scene'
    } else {
      stepLabel = 'Ready'
    }
  }

  return (
    <div
      aria-label={`Loading: ${stepLabel} (${pct}%)`}
      aria-live="polite"
      role="status"
      style={{
        position: 'fixed',
        inset: 0,
        background: TOKENS.color.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        zIndex: 9999,
      }}
    >
      <h1
        style={{
          fontFamily: TOKENS.font.heading,
          fontSize: '28px',
          fontWeight: 700,
          lineHeight: 1.1,
          color: TOKENS.color.text,
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        HelioNet
      </h1>

      {/* 4px Progress bar */}
      <div
        style={{
          width: 'min(320px, 80vw)',
          height: '4px',
          background: TOKENS.color.hairline,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: TOKENS.color.text,
            transition: reducedMotion ? 'none' : `width ${TOKENS.transition.base}`,
          }}
        />
      </div>

      <p
        style={{
          fontFamily: TOKENS.font.sans,
          fontSize: '14px',
          lineHeight: 1.4,
          color: TOKENS.color.muted,
          margin: 0,
        }}
      >
        {stepLabel} —{' '}
        <span style={{ fontFamily: TOKENS.font.mono, fontVariantNumeric: 'tabular-nums' }}>
          {pct}%
        </span>
      </p>
    </div>
  )
}
