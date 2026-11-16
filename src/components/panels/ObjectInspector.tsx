import React from 'react'
import { useHelioStore } from '../../store/helioStore'
import { satelliteSelection } from '../../three/satelliteSelection'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { formatNumber } from '../../utils/format'
import { TOKENS } from '../../tokens'

function getSatelliteStatusMeta(status: 'nominal' | 'atRisk' | 'lost') {
  switch (status) {
    case 'atRisk':
      return { label: 'At risk', shape: '○', color: TOKENS.color.amber }
    case 'lost':
      return { label: 'Lost', shape: '▲', color: TOKENS.color.redOrange }
    default:
      return { label: 'Nominal', shape: '✓', color: TOKENS.color.moss }
  }
}

function getShelterStatusMeta(status: 'nominal' | 'crowded' | 'full') {
  switch (status) {
    case 'crowded':
      return { label: 'Crowded', shape: '○', color: TOKENS.color.amber }
    case 'full':
      return { label: 'Full', shape: '▲', color: TOKENS.color.redOrange }
    default:
      return { label: 'Nominal', shape: '✓', color: TOKENS.color.moss }
  }
}

/**
 * Renders both the hover tooltip and click inspector card for satellites and lunar shelters.
 */
export function ObjectInspector(): React.ReactElement | null {
  const presentationMode = useHelioStore((s) => s.presentationMode)
  const hoveredEntity = useHelioStore((s) => s.hoveredEntity)
  const selectedEntity = useHelioStore((s) => s.selectedEntity)
  const setSelectedEntity = useHelioStore((s) => s.setSelectedEntity)
  const satellites = useHelioStore((s) => s.constellation.satellites)
  const shelters = useHelioStore((s) => s.surface.shelters)
  const targetShelterId = useHelioStore((s) => s.surface.targetShelterId)

  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'

  if (presentationMode) {
    return null
  }

  const hoveredSat =
    hoveredEntity?.kind === 'satellite'
      ? satellites.find((s) => s.id === hoveredEntity.id) ?? null
      : null
  const hoveredShelter =
    hoveredEntity?.kind === 'shelter'
      ? shelters.find((s) => s.id === hoveredEntity.id) ?? null
      : null

  const selectedSat =
    selectedEntity?.kind === 'satellite'
      ? satellites.find((s) => s.id === selectedEntity.id) ?? null
      : null
  const selectedShelter =
    selectedEntity?.kind === 'shelter'
      ? shelters.find((s) => s.id === selectedEntity.id) ?? null
      : null

  const closeInspector = () => {
    satelliteSelection.selectedId = null
    setSelectedEntity(null)
  }

  const tooltipLeft = hoveredEntity
    ? Math.min(Math.max(12, hoveredEntity.x + 14), typeof window !== 'undefined' ? window.innerWidth - 220 : hoveredEntity.x + 14)
    : 0
  const tooltipTop = hoveredEntity
    ? Math.min(Math.max(56, hoveredEntity.y - 12), typeof window !== 'undefined' ? window.innerHeight - 80 : hoveredEntity.y)
    : 0

  return (
    <>
      {/* Hover tooltip */}
      {(hoveredSat || hoveredShelter) && hoveredEntity && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: `${tooltipLeft}px`,
            top: `${tooltipTop}px`,
            pointerEvents: 'none',
            zIndex: 45,
            background: TOKENS.panel.background,
            border: TOKENS.panel.border,
            borderRadius: '6px',
            padding: '6px 10px',
            fontFamily: TOKENS.font.sans,
            fontSize: '14px',
            lineHeight: 1.35,
            color: TOKENS.color.text,
            whiteSpace: 'nowrap',
          }}
        >
          {hoveredSat && (() => {
            const meta = getSatelliteStatusMeta(hoveredSat.status)
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontFamily: TOKENS.font.mono }}>
                  SAT-{String(hoveredSat.id).padStart(3, '0')}
                </span>
                <span style={{ color: meta.color }}>
                  {meta.shape} {meta.label}
                </span>
                <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono }}>
                  {formatNumber(hoveredSat.altitudeKm, 1, ' km')}
                </span>
              </div>
            )
          })()}

          {hoveredShelter && (() => {
            const meta = getShelterStatusMeta(hoveredShelter.status)
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>{hoveredShelter.name}</span>
                <span style={{ color: meta.color }}>
                  {meta.shape} {meta.label}
                </span>
                <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono }}>
                  {hoveredShelter.capacity} crew
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* Click inspector card */}
      {(selectedSat || selectedShelter) && (
        <aside
          aria-label="Selected object inspector"
          data-testid="object-inspector"
          style={{
            position: 'absolute',
            ...(isPhone
              ? {
                  top: '108px',
                  left: '16px',
                  right: '16px',
                }
              : {
                  top: '80px',
                  left: '380px',
                  width: '280px',
                }),
            background: TOKENS.panel.background,
            border: TOKENS.panel.border,
            borderRadius: TOKENS.panel.borderRadius,
            padding: TOKENS.panel.padding,
            color: TOKENS.color.text,
            fontFamily: TOKENS.font.sans,
            lineHeight: 1.4,
            zIndex: 28,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h3
              style={{
                margin: 0,
                fontFamily: TOKENS.font.heading,
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: 1.1,
                color: TOKENS.color.text,
              }}
            >
              {selectedSat ? `SAT-${String(selectedSat.id).padStart(3, '0')}` : selectedShelter?.name}
            </h3>

            <button
              type="button"
              onClick={closeInspector}
              aria-label="Close inspector"
              style={{
                minWidth: isPhone ? '44px' : '28px',
                minHeight: isPhone ? '44px' : '28px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: TOKENS.color.muted,
                fontSize: '14px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>

          {selectedSat && (() => {
            const meta = getSatelliteStatusMeta(selectedSat.status)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>State</span>
                  <span style={{ color: meta.color, fontWeight: 500 }}>
                    {meta.shape} {meta.label}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>Altitude</span>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>
                    {formatNumber(selectedSat.altitudeKm, 1, ' km')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>Orbit plane</span>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>
                    Plane {selectedSat.plane + 1} / 6
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>Drag decay</span>
                  <span style={{ color: selectedSat.isDecaying ? TOKENS.color.amber : TOKENS.color.text }}>
                    {selectedSat.isDecaying ? 'Active' : 'Stable'}
                  </span>
                </div>
              </div>
            )
          })()}

          {selectedShelter && (() => {
            const meta = getShelterStatusMeta(selectedShelter.status)
            const isTarget = selectedShelter.id === targetShelterId
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>State</span>
                  <span style={{ color: meta.color, fontWeight: 500 }}>
                    {meta.shape} {meta.label}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>Capacity</span>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>
                    {selectedShelter.capacity} crew
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>Grid coordinates</span>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>
                    ({selectedShelter.gridX}, {selectedShelter.gridY})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: TOKENS.color.muted }}>Assignment</span>
                  <span style={{ color: isTarget ? TOKENS.color.moss : TOKENS.color.text }}>
                    {isTarget ? 'Active destination' : 'Alternate shelter'}
                  </span>
                </div>
              </div>
            )
          })()}
        </aside>
      )}
    </>
  )
}
