import React from 'react'
import { useHelioStore } from '../../store/helioStore'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'

interface LegendEntry {
  key: string
  swatch: 'dot' | 'ring' | 'line' | 'thick-line' | 'shape'
  color: string
  shapeChar?: string
  panelColor?: string
  label: string
}

const STATUS_ENTRIES: LegendEntry[] = [
  { key: 'watch', swatch: 'shape', color: TOKENS.color.amber, shapeChar: '○', label: 'Watch alert' },
  { key: 'confirmed', swatch: 'shape', color: TOKENS.color.redOrange, shapeChar: '▲', label: 'Confirmed alert' },
  { key: 'resolved', swatch: 'shape', color: TOKENS.color.moss, shapeChar: '✓', label: 'Resolved alert' },
  { key: 'false', swatch: 'shape', color: TOKENS.color.muted, shapeChar: '—', label: 'False alarm / idle' },
]

const ORBIT_ENTRIES: LegendEntry[] = [
  { key: 'sun', swatch: 'dot', color: TOKENS.color.amber, label: 'Sun (glowing core)' },
  { key: 'storm', swatch: 'dot', color: TOKENS.color.redOrange, label: 'Storm front shell' },
  { key: 'sat-nom', swatch: 'dot', color: '#C9CDD4', panelColor: '#2E3A4D', label: 'Nominal satellite' },
  { key: 'sat-risk', swatch: 'dot', color: TOKENS.color.amber, panelColor: '#2E3A4D', label: 'At-risk satellite' },
  { key: 'sat-lost', swatch: 'dot', color: TOKENS.color.redOrange, panelColor: '#2E3A4D', label: 'Lost satellite (fading)' },
  { key: 'link', swatch: 'line', color: TOKENS.color.slateBlue, label: 'Same-plane link (25%)' },
  { key: 'reroute', swatch: 'thick-line', color: TOKENS.color.slateBlue, label: 'Rerouted backup path' },
]

const SURFACE_ENTRIES: LegendEntry[] = [
  { key: 'shelter', swatch: 'ring', color: TOKENS.color.moss, label: 'Shelter dome + safe ring' },
  { key: 'route', swatch: 'thick-line', color: TOKENS.color.text, label: 'Pareto safe rover route' },
  { key: 'rover-race', swatch: 'dot', color: TOKENS.color.redOrange, label: 'Rover 01 (moving)' },
  { key: 'rover-safe', swatch: 'dot', color: TOKENS.color.moss, label: 'Rover 01 (sheltered)' },
  { key: 'exposure', swatch: 'dot', color: TOKENS.color.amber, label: 'High exposure terrain' },
]

export interface SceneLegendProps {
  containerMode?: boolean
  style?: React.CSSProperties
}

/**
 * Small collapsible "Key" explaining every colour and shape in the active scene.
 * Starts collapsed by default to keep HUD uncluttered.
 */
export function SceneLegend({ containerMode = false, style }: SceneLegendProps): React.ReactElement {
  const scene = useHelioStore((s) => s.scene)
  const isOpen = useHelioStore((s) => s.openSecondaryPanel === 'key')
  const toggleSecondaryPanel = useHelioStore((s) => s.toggleSecondaryPanel)

  const sceneEntries = scene === 'surface' ? SURFACE_ENTRIES : ORBIT_ENTRIES

  const renderSwatch = (entry: LegendEntry): React.ReactElement => {
    if (entry.swatch === 'shape') {
      return (
        <span
          aria-hidden="true"
          style={{
            width: '16px',
            textAlign: 'center',
            color: entry.color,
            fontSize: '13px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {entry.shapeChar}
        </span>
      )
    }

    if (entry.swatch === 'line' || entry.swatch === 'thick-line') {
      return (
        <span
          aria-hidden="true"
          style={{
            width: '16px',
            height: entry.swatch === 'thick-line' ? '3px' : '1px',
            background: entry.color,
            opacity: entry.swatch === 'line' ? 0.55 : 1,
            borderRadius: '2px',
            flexShrink: 0,
          }}
        />
      )
    }

    if (entry.swatch === 'ring') {
      return (
        <span
          aria-hidden="true"
          style={{
            width: '12px',
            height: '12px',
            margin: '0 2px',
            borderRadius: '50%',
            background: '#D2D6DE',
            border: `2px solid ${entry.color}`,
            flexShrink: 0,
          }}
        />
      )
    }

    return (
      <span
        aria-hidden="true"
        style={{
          width: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1px',
          flexShrink: 0,
        }}
      >
        {entry.panelColor && (
          <span style={{ width: '4px', height: '3px', background: entry.panelColor, borderRadius: '1px' }} />
        )}
        <span
          style={{
            width: entry.panelColor ? '6px' : '10px',
            height: entry.panelColor ? '6px' : '10px',
            borderRadius: entry.panelColor ? '2px' : '50%',
            background: entry.color,
          }}
        />
        {entry.panelColor && (
          <span style={{ width: '4px', height: '3px', background: entry.panelColor, borderRadius: '1px' }} />
        )}
      </span>
    )
  }

  return (
    <ErrorBoundary label="Scene Key">
      <aside
        aria-label="Scene colour and shape key"
        style={{
          position: containerMode ? 'relative' : 'absolute',
          top: containerMode ? 'auto' : '80px',
          right: containerMode ? 'auto' : '24px',
          width: containerMode ? '100%' : '320px',
          color: TOKENS.color.text,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          zIndex: 20,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          ...style,
        }}
      >
        {/* Header sharing unified right-rail style */}
        <button
          type="button"
          onClick={() => toggleSecondaryPanel('key')}
          aria-expanded={isOpen}
          style={{
            width: '100%',
            minHeight: '44px',
            boxSizing: 'border-box',
            padding: '10px 14px',
            background: 'rgba(14, 15, 18, 0.78)',
            border: '1px solid rgba(42, 45, 52, 0.6)',
            borderRadius: '6px',
            color: TOKENS.color.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            textAlign: 'left',
            transition: 'background-color 120ms cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(14, 15, 18, 0.78)')}
        >
          <h2
            style={{
              fontFamily: TOKENS.font.heading,
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
              color: TOKENS.color.text,
            }}
          >
            Key
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '13px',
                color: TOKENS.color.muted,
                fontWeight: 400,
              }}
            >
              Legend
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 220ms cubic-bezier(0.25, 1, 0.5, 1)',
                color: isOpen ? TOKENS.color.text : TOKENS.color.muted,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <polyline points="6 4 10 8 6 12" />
            </svg>
          </div>
        </button>

        {/* Animated height container (220ms) */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: isOpen ? '500px' : '0px',
            opacity: isOpen ? 1 : 0,
            transition: 'max-height 220ms cubic-bezier(0.25, 1, 0.5, 1), opacity 220ms cubic-bezier(0.25, 1, 0.5, 1)',
            background: TOKENS.panel.background,
            border: isOpen ? TOKENS.panel.border : 'none',
            borderRadius: TOKENS.panel.borderRadius,
            boxSizing: 'border-box',
          }}
        >
          {isOpen && (
            <div style={{ padding: TOKENS.panel.padding, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sceneEntries.map((entry) => (
                  <div
                    key={entry.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      color: TOKENS.color.text,
                    }}
                  >
                    {renderSwatch(entry)}
                    <span>{entry.label}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: `1px solid ${TOKENS.color.hairline}`,
                  paddingTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {STATUS_ENTRIES.map((entry) => (
                  <div
                    key={entry.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      color: TOKENS.color.muted,
                    }}
                  >
                    {renderSwatch(entry)}
                    <span>{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </ErrorBoundary>
  )
}
