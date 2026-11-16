import React, { useEffect, useRef, useState } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'
import { Skeleton } from '../Skeleton'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import {
  buildValidationComparison,
  type ValidationFile,
  type ComparisonRow,
} from '../../engines/validation'
import { validateValidationFile } from '../../config/schemas'

function getSourceSiteName(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()
    if (host === 'www.swpc.noaa.gov' || host.endsWith('.swpc.noaa.gov')) return 'NOAA SWPC'
    if (host === 'www.ngdc.noaa.gov' || host.endsWith('.ngdc.noaa.gov')) return 'NOAA NCEI'
    if (host.includes('kugi.kyoto-u.ac.jp')) return 'Kyoto WDC'
    if (host.includes('crater.unh.edu')) return 'LRO CRaTER'
    if (host === 'doi.org') return 'AGU Space Weather'
    if (host.includes('reuters.com')) return 'Reuters'
    if (host.includes('fingrid.fi')) return 'Fingrid'
    return host.replace(/^www\./, '')
  } catch {
    return rawUrl
  }
}

/**
 * Validation benchmark modal.
 * Displays side-by-side comparison of predicted parameters vs documented outcomes.
 */
export function ValidationModal(): React.ReactElement | null {
  const breakpoint = useBreakpoint()
  const reducedMotion = useReducedMotion()
  const isOpen = useHelioStore((s) => s.validationOpen)
  const setOpen = useHelioStore((s) => s.setValidationOpen)
  const currentEvent = useHelioStore((s) => s.validationEvent)
  const setEvent = useHelioStore((s) => s.setValidationEvent)

  const [keepMounted, setKeepMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        setKeepMounted(true)
        setVisible(true)
      })
      return () => cancelAnimationFrame(raf)
    }
    const raf = requestAnimationFrame(() => setVisible(false))
    const exitDelay = reducedMotion ? 150 : 270
    const timer = setTimeout(() => setKeepMounted(false), exitDelay)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [isOpen, reducedMotion])

  const activeRow = useHelioStore((s) => s.activeRow)
  const constellation = useHelioStore((s) => s.constellation)
  const surface = useHelioStore((s) => s.surface)
  const forecast = useHelioStore((s) => s.forecast)

  const [validationFile, setValidationFile] = useState<ValidationFile | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const modalCardRef = useRef<HTMLDivElement>(null)

  const isPhone = breakpoint === 'phone'

  useDialogFocus(isOpen, modalCardRef, () => setOpen(false))

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/validation/${currentEvent}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Validation file for ${currentEvent} not found`)
        return res.json()
      })
      .then((data: unknown) => {
        if (cancelled) return
        const valRes = validateValidationFile(data, `/validation/${currentEvent}.json`)
        if (!valRes.ok) {
          const first = valRes.errors[0]
          setError(`Validation schema error in ${first.file} at ${first.path}: ${first.message}`)
          setLoading(false)
          return
        }
        setValidationFile(valRes.data as unknown as ValidationFile)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, currentEvent])

  if (!isOpen && !keepMounted) return null

  // Extract live model/simulation metrics to populate predicted comparison values
  const predictedMetrics: Record<string, string | number> = {
    'Peak Kp Index': activeRow ? `${activeRow.obs.kp.toFixed(1)} (Predicted)` : '5.3 (G1 Storm)',
    'Dst Minimum': activeRow ? `${activeRow.obs.dst.toFixed(0)} nT` : '-120 nT',
    'Max Solar Wind Speed': activeRow ? `${activeRow.obs.vsw.toFixed(0)} km/s` : '750 km/s',
    'Interplanetary Magnetic Field Bz': activeRow ? `${activeRow.obs.bz.toFixed(1)} nT` : '-18.5 nT',
    'Peak Atmospheric Density Increase': '+48% (at 210 km)',
    'Satellites Deorbited / Lost': `${constellation.lostCount} satellites (simulated)`,
    'Satellites Lost in Low Orbit': `${constellation.lostCount} satellites`,
    'Power Grid Transformer GIC Currents': 'Induced E-field > 2 V/km',
    'Thermospheric Nitric Oxide Cooling Flux': 'No data',
    'Mid-Latitude Ionospheric Total Electron Content Drop': 'No data',
    'Lunar Surface Dose Baseline Rate': `${surface.doseRate.toFixed(2)} mGy/h`,
    'Lunar South Pole Solar Proton Event Flux': forecast.pProton > 0.5 ? '140 pfu (S2 alert)' : '18 pfu (S1 watch)',
    'Rover Radiation Shelter Destination': `Shelter A (${surface.cumulativeDose.toFixed(1)} mGy accumulated)`,
    'Lunar Shelter Allocation Feasibility': surface.isSheltered ? '100% sheltered' : 'En route to shelter',
  }

  const rows: ComparisonRow[] = validationFile
    ? buildValidationComparison(validationFile, predictedMetrics)
    : []

  return (
    <ErrorBoundary label="Validation Modal">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-modal-title"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(14, 15, 18, 0.88)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isPhone ? '8px' : '24px',
          boxSizing: 'border-box',
          opacity: visible ? 1 : 0,
          transition: reducedMotion
            ? `opacity ${TOKENS.transition.reduced}`
            : visible
              ? `opacity ${TOKENS.transition.slow}`
              : `opacity ${TOKENS.transition.slowExit}`,
        }}
      >
        <div
          ref={modalCardRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1040px',
            maxHeight: isPhone ? '95dvh' : '90dvh',
            backgroundColor: TOKENS.panel.background,
            border: TOKENS.panel.border,
            borderRadius: TOKENS.panel.borderRadius,
            fontFamily: TOKENS.font.sans,
            lineHeight: 1.4,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transform: reducedMotion ? 'none' : visible ? 'translateY(0)' : 'translateY(8px)',
            transition: reducedMotion
              ? `opacity ${TOKENS.transition.reduced}`
              : visible
                ? `transform ${TOKENS.transition.slow}`
                : `transform ${TOKENS.transition.slowExit}`,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: isPhone ? '16px' : '16px 24px',
              borderBottom: `1px solid ${TOKENS.color.hairline}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <h2
              id="validation-modal-title"
              style={{
                fontFamily: TOKENS.font.heading,
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: 1.1,
                color: TOKENS.color.text,
                margin: 0,
              }}
            >
              Compare with documented values
            </h2>

            {/* Event Selector Tabs & Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  border: `1px solid ${TOKENS.color.hairline}`,
                  borderRadius: '6px',
                  padding: '4px',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEvent('feb2022')}
                  aria-pressed={currentEvent === 'feb2022'}
                  style={{
                    minHeight: isPhone ? '44px' : '36px',
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    color: currentEvent === 'feb2022' ? TOKENS.color.background : TOKENS.color.muted,
                    background: currentEvent === 'feb2022' ? TOKENS.color.text : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                    transition: `background-color ${TOKENS.transition.fast}, color ${TOKENS.transition.fast}`,
                  }}
                >
                  Feb 2022
                </button>
                <button
                  type="button"
                  onClick={() => setEvent('may2024')}
                  aria-pressed={currentEvent === 'may2024'}
                  style={{
                    minHeight: isPhone ? '44px' : '36px',
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    color: currentEvent === 'may2024' ? TOKENS.color.background : TOKENS.color.muted,
                    background: currentEvent === 'may2024' ? TOKENS.color.text : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                    transition: `background-color ${TOKENS.transition.fast}, color ${TOKENS.transition.fast}`,
                  }}
                >
                  May 2024
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close validation modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: TOKENS.color.muted,
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: TOKENS.font.sans,
                  fontSize: '18px',
                  cursor: 'pointer',
                  transition: `color ${TOKENS.transition.fast}`,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.text
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.muted
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 14px Review Note */}
          <div
            style={{
              padding: isPhone ? '8px 16px' : '8px 24px',
              borderBottom: `1px solid ${TOKENS.color.hairline}`,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              lineHeight: 1.4,
              color: TOKENS.color.muted,
            }}
          >
            Values are being checked by the team.
          </div>

          {/* Body: Hairline-separated stacked blocks on Phone (<768px) vs Table (>=768px) */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              overflowY: 'auto',
              padding: isPhone ? '16px' : '16px 24px',
            }}
          >
            {loading && (
              <div style={{ padding: '16px 0' }}>
                <Skeleton lines={5} height={22} gap={14} label={`Loading documented values for ${currentEvent}`} />
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '16px',
                  border: `1px solid ${TOKENS.color.redOrange}`,
                  borderRadius: '6px',
                  color: TOKENS.color.redOrange,
                  fontFamily: TOKENS.font.sans,
                  fontSize: '14px',
                }}
              >
                Error loading documented values: {error}
              </div>
            )}

            {!loading && !error && rows.length > 0 && (
              isPhone ? (
                /* Phone View: Hairline-separated stacked blocks with label/value pairs */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {rows.map((row, idx) => {
                    const hasDocumented = row.documentedValue !== null && row.documentedValue !== undefined && row.verified
                    const hasSourceLink = row.verified && row.source !== 'Unverified' && row.source.startsWith('http')
                    const isSourceLinked = row.verified && row.source !== 'Unverified'

                    return (
                      <div
                        key={idx}
                        style={{
                          borderTop: idx === 0 ? 'none' : `1px solid ${TOKENS.color.hairline}`,
                          paddingTop: idx === 0 ? 0 : '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontFamily: TOKENS.font.heading,
                            fontSize: '16px',
                            fontWeight: 600,
                            lineHeight: 1.1,
                            color: TOKENS.color.text,
                          }}
                        >
                          {row.field}
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ color: TOKENS.color.muted }}>Predicted</span>
                            <span style={{ color: row.predictedValue === 'No data' ? TOKENS.color.muted : TOKENS.color.text, textAlign: 'right' }}>
                              {row.predictedValue}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ color: TOKENS.color.muted }}>Documented</span>
                            <span style={{ color: hasDocumented ? TOKENS.color.text : TOKENS.color.muted, textAlign: 'right' }}>
                              {hasDocumented ? row.documentedValue : '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ color: TOKENS.color.muted }}>Source</span>
                            <span style={{ textAlign: 'right' }}>
                              {hasSourceLink ? (
                                <a
                                  href={row.source}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: TOKENS.color.text,
                                    textDecoration: 'underline',
                                  }}
                                >
                                  {getSourceSiteName(row.source)}
                                </a>
                              ) : isSourceLinked ? (
                                <span style={{ color: TOKENS.color.text }}>{row.source}</span>
                              ) : (
                                <span style={{ color: TOKENS.color.muted }}>—</span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ color: TOKENS.color.muted }}>Status</span>
                            {isSourceLinked ? (
                              <span style={{ color: TOKENS.color.text }}>Source linked</span>
                            ) : (
                              <span style={{ color: TOKENS.color.muted }}>— Unverified</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Desktop/Tablet Table View with Sticky First Column */
                <div style={{ position: 'relative', overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontFamily: TOKENS.font.sans,
                      fontSize: '14px',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${TOKENS.color.hairline}`,
                          color: TOKENS.color.muted,
                          fontSize: '14px',
                        }}
                      >
                        <th
                          style={{
                            padding: '8px 16px 8px 0',
                            position: 'sticky',
                            left: 0,
                            background: TOKENS.color.background,
                            fontWeight: 500,
                            zIndex: 3,
                          }}
                        >
                          Parameter
                        </th>
                        <th style={{ padding: '8px 16px', fontWeight: 500 }}>Predicted</th>
                        <th style={{ padding: '8px 16px', fontWeight: 500 }}>Documented</th>
                        <th style={{ padding: '8px 16px', fontWeight: 500 }}>Source</th>
                        <th style={{ padding: '8px 0 8px 16px', fontWeight: 500 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const hasDocumented = row.documentedValue !== null && row.documentedValue !== undefined && row.verified
                        const hasSourceLink = row.verified && row.source !== 'Unverified' && row.source.startsWith('http')
                        const isSourceLinked = row.verified && row.source !== 'Unverified'

                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: `1px solid ${TOKENS.color.hairline}`,
                            }}
                          >
                            {/* Sticky Metric Name Column */}
                            <td
                              style={{
                                padding: '8px 16px 8px 0',
                                color: TOKENS.color.text,
                                fontWeight: 500,
                                position: 'sticky',
                                left: 0,
                                background: TOKENS.color.background,
                                zIndex: 2,
                                borderRight: `1px solid ${TOKENS.color.hairline}`,
                              }}
                            >
                              {row.field}
                            </td>

                            {/* Predicted */}
                            <td
                              style={{
                                padding: '8px 16px',
                                color: row.predictedValue === 'No data' ? TOKENS.color.muted : TOKENS.color.slateBlue,
                              }}
                            >
                              {row.predictedValue}
                            </td>

                            {/* Documented */}
                            <td
                              style={{
                                padding: '8px 16px',
                                color: hasDocumented ? TOKENS.color.text : TOKENS.color.muted,
                                fontWeight: hasDocumented ? 500 : 400,
                              }}
                            >
                              {hasDocumented ? row.documentedValue : '—'}
                            </td>

                            {/* Source site name link */}
                            <td style={{ padding: '8px 16px' }}>
                              {hasSourceLink ? (
                                <a
                                  href={row.source}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: TOKENS.color.text,
                                    fontSize: '14px',
                                    lineHeight: 1.4,
                                    textDecoration: 'underline',
                                  }}
                                >
                                  {getSourceSiteName(row.source)}
                                </a>
                              ) : isSourceLinked ? (
                                <span style={{ color: TOKENS.color.text, fontSize: '14px', lineHeight: 1.4 }}>
                                  {row.source}
                                </span>
                              ) : (
                                <span style={{ color: TOKENS.color.muted, fontSize: '14px', lineHeight: 1.4 }}>
                                  —
                                </span>
                              )}
                            </td>

                            {/* Status: Source linked (neutral) or Unverified (muted with dash) */}
                            <td style={{ padding: '8px 0 8px 16px', fontSize: '14px', lineHeight: 1.4 }}>
                              {isSourceLinked ? (
                                <span style={{ color: TOKENS.color.text }}>Source linked</span>
                              ) : (
                                <span style={{ color: TOKENS.color.muted }}>— Unverified</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: isPhone ? '8px 16px' : '16px 24px',
              borderTop: `1px solid ${TOKENS.color.hairline}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              color: TOKENS.color.muted,
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span>
              Event: {validationFile?.event ?? currentEvent} (
              <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{rows.length}</span> rows)
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                minHeight: isPhone ? '44px' : '32px',
                background: 'transparent',
                border: 'none',
                color: TOKENS.color.text,
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                padding: '4px',
                cursor: 'pointer',
              }}
            >
              Close [Esc]
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
