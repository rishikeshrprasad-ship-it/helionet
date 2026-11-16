import React, { useState, useRef } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'
import { Skeleton } from '../Skeleton'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export function AgentDrawer(): React.ReactElement {
  const breakpoint = useBreakpoint()
  const reducedMotion = useReducedMotion()
  const agentLog = useHelioStore((s) => s.agentLog)
  const agentCatalogStatus = useHelioStore((s) => s.agentCatalogStatus)
  const setAgentLog = useHelioStore((s) => s.setAgentLog)

  const { drawerOpen, steps, analogs, kbCitations } = agentLog

  // Collapsible section state for phone view (<768px)
  // Spec: Execution trace open, Analogs closed, Citations closed
  const [traceOpen, setTraceOpen] = useState(true)
  const [analogsOpen, setAnalogsOpen] = useState(false)
  const [citationsOpen, setCitationsOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)

  const isPhone = breakpoint === 'phone'
  const isTablet = breakpoint === 'tablet'

  useDialogFocus(
    drawerOpen,
    drawerRef,
    () => setAgentLog({ drawerOpen: false }),
    '[data-testid="agent-drawer-trigger"]'
  )

  return (
    <ErrorBoundary label="Agent Audit Drawer">
      {/* Floating Toggle Button: Shown ONLY on desktop (moved to header on tablet, tab/menu on phone) */}
      {breakpoint === 'desktop' && (
        <button
          data-testid="agent-drawer-trigger"
          onClick={() => setAgentLog({ drawerOpen: !drawerOpen })}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? 'Close how it decided drawer' : 'Open how it decided drawer'}
          style={{
            position: 'absolute',
            bottom: '100px',
            left: '16px',
            minHeight: '44px',
            background: TOKENS.panel.background,
            border: TOKENS.panel.border,
            borderRadius: TOKENS.panel.borderRadius,
            padding: '8px 16px',
            color: TOKENS.color.text,
            fontFamily: TOKENS.font.sans,
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.4,
            cursor: 'pointer',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: `border-color ${TOKENS.transition.fast}`,
          }}
        >
          <span aria-hidden="true" style={{ color: TOKENS.color.text }}>⚡</span>
          <span>How it decided</span>
          <span aria-hidden="true">{drawerOpen ? '▼' : '▲'}</span>
        </button>
      )}

      {/* Slide-up Drawer Content */}
      <aside
        ref={drawerRef}
        role={drawerOpen ? 'dialog' : undefined}
        aria-modal={drawerOpen || undefined}
        aria-hidden={!drawerOpen}
        aria-label="How it decided"
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: isTablet ? '324px' : '0',
          height: drawerOpen ? (isPhone ? '70dvh' : '340px') : '0',
          maxHeight: isPhone ? '70dvh' : '400px',
          background: TOKENS.panel.background,
          borderTop: drawerOpen ? TOKENS.panel.border : 'none',
          borderRight: drawerOpen && isTablet ? TOKENS.panel.border : 'none',
          color: TOKENS.color.text,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          zIndex: 40,
          overflow: 'hidden',
          visibility: drawerOpen ? 'visible' : 'hidden',
          pointerEvents: drawerOpen ? 'auto' : 'none',
          opacity: reducedMotion ? (drawerOpen ? 1 : 0) : 1,
          transition: reducedMotion
            ? `opacity ${TOKENS.transition.reduced}`
            : drawerOpen
              ? `height ${TOKENS.transition.slow}`
              : `height ${TOKENS.transition.slowExit}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: TOKENS.panel.padding,
            height: '100%',
            boxSizing: 'border-box',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  fontFamily: TOKENS.font.heading,
                  fontSize: '20px',
                  fontWeight: 600,
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                How it decided
              </h3>
              <span
                style={{
                  fontFamily: TOKENS.font.sans,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: TOKENS.color.moss,
                }}
              >
                {steps.length > 0 ? (
                  <>
                    <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{steps.length}</span> steps
                  </>
                ) : (
                  '7 steps'
                )}
              </span>
            </div>

            <button
              onClick={() => setAgentLog({ drawerOpen: false })}
              aria-label="Close agent drawer"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: TOKENS.color.muted,
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <span aria-hidden="true">✕</span>
              <span>&nbsp;Close</span>
            </button>
          </div>

          {/* Phone View: One Column with 3 Collapsible Sections (hairline-separated rows) */}
          {isPhone ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
              {/* Section 1: Execution Trace (default open) */}
              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}` }}>
                <button
                  onClick={() => setTraceOpen(!traceOpen)}
                  aria-expanded={traceOpen}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    Cycle trace (<span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{steps.length}</span> steps)
                  </span>
                  <span aria-hidden="true">{traceOpen ? '▾' : '▸'}</span>
                </button>
                {traceOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
                    {steps.length === 0 ? (
                      <div style={{ color: TOKENS.color.muted, fontSize: '14px', fontFamily: TOKENS.font.sans }}>
                        Cycle active · waiting for next observation...
                      </div>
                    ) : (
                      steps.map((st, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderTop: `1px solid ${TOKENS.color.hairline}`,
                            paddingTop: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontFamily: TOKENS.font.sans,
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: TOKENS.color.text, fontWeight: 500 }}>
                              <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{idx + 1}.</span> {st.step}
                            </span>
                            {typeof st.outputs?.inferenceTimeMs === 'string' && (
                              <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono, fontSize: '14px' }}>
                                ({st.outputs.inferenceTimeMs})
                              </span>
                            )}
                          </div>
                          <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono, fontSize: '14px' }}>
                            {st.ms} ms
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Historical Analogs (default closed) */}
              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}` }}>
                <button
                  onClick={() => setAnalogsOpen(!analogsOpen)}
                  aria-expanded={analogsOpen}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    Historical analogs (<span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{analogs.length}</span>)
                  </span>
                  <span aria-hidden="true">{analogsOpen ? '▾' : '▸'}</span>
                </button>
                {analogsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
                    {analogs.map((an) => (
                      <div
                        key={an.id}
                        style={{
                          borderTop: `1px solid ${TOKENS.color.hairline}`,
                          paddingTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: TOKENS.color.text, fontFamily: TOKENS.font.heading }}>
                            {an.name}
                          </span>
                          <span style={{ color: TOKENS.color.slateBlue, fontFamily: TOKENS.font.sans, fontWeight: 500, fontSize: '14px' }}>
                            <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{Math.round(an.similarity * 100)}%</span> match
                          </span>
                        </div>
                        <p style={{ margin: 0, color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4 }}>
                          {an.source && an.source.trim().length > 0 && an.source.startsWith('http') ? (
                            `${an.description.slice(0, 110)}...`
                          ) : (
                            <span style={{ fontStyle: 'italic', color: TOKENS.color.muted }}>No sourced summary</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Knowledge Base Citations (default closed) */}
              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}` }}>
                <button
                  onClick={() => setCitationsOpen(!citationsOpen)}
                  aria-expanded={citationsOpen}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    KB citations (<span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{kbCitations.length}</span>)
                  </span>
                  <span aria-hidden="true">{citationsOpen ? '▾' : '▸'}</span>
                </button>
                {citationsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
                    {kbCitations.map((cit, i) => (
                      <div
                        key={i}
                        style={{
                          borderTop: `1px solid ${TOKENS.color.hairline}`,
                          paddingTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: TOKENS.color.text, fontFamily: TOKENS.font.heading }}>
                            {cit.title}
                          </div>
                          {cit.needs_verification && (
                            <span
                              style={{
                                fontFamily: TOKENS.font.sans,
                                fontSize: '14px',
                                fontWeight: 500,
                                color: TOKENS.color.muted,
                                flexShrink: 0,
                              }}
                            >
                              Unverified
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4 }}>
                          {cit.summary.slice(0, 120)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Desktop / Tablet View: 3-Column Hairline Rows */
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px', flex: 1, overflowY: 'auto' }}>
              {/* Column 1: Execution Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    color: TOKENS.color.muted,
                  }}
                >
                  Cycle trace (Observe → Analyze → Research → Plan → Act → Confirm → Report)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {steps.length === 0 ? (
                    <Skeleton lines={4} height={16} label="Loading cycle trace" />
                  ) : (
                    steps.map((st, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderTop: `1px solid ${TOKENS.color.hairline}`,
                        paddingTop: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontFamily: TOKENS.font.sans,
                        fontSize: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: TOKENS.color.text, fontWeight: 500 }}>
                          <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{idx + 1}.</span> {st.step}
                        </span>
                        {typeof st.outputs?.inferenceTimeMs === 'string' && (
                          <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono, fontSize: '14px' }}>
                            ({st.outputs.inferenceTimeMs})
                          </span>
                        )}
                      </div>
                      <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono, fontSize: '14px' }}>
                        {st.ms} ms
                      </span>
                    </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Historical Analogs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    color: TOKENS.color.muted,
                  }}
                >
                  Historical analogs (cosine similarity)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {agentCatalogStatus === 'loading' ? (
                    <Skeleton lines={3} height={18} label="Loading historical analogs" />
                  ) : agentCatalogStatus === 'error' ? (
                    <div style={{ fontSize: '14px', color: TOKENS.color.redOrange }}>
                      Could not load events catalog (/models/events_index.json).
                    </div>
                  ) : analogs.length === 0 ? (
                    <div style={{ fontSize: '14px', color: TOKENS.color.muted }}>
                      No matching historical analogs found.
                    </div>
                  ) : (
                    analogs.map((an) => (
                    <div
                      key={an.id}
                      style={{
                        borderTop: `1px solid ${TOKENS.color.hairline}`,
                        paddingTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: TOKENS.color.text, fontFamily: TOKENS.font.heading }}>
                          {an.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span style={{ color: TOKENS.color.slateBlue, fontFamily: TOKENS.font.sans, fontWeight: 500, fontSize: '14px' }}>
                            <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{Math.round(an.similarity * 100)}%</span> match
                          </span>
                          <span style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px' }}>
                            Illustrative similarity
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: 0, color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4 }}>
                        {an.source && an.source.trim().length > 0 && an.source.startsWith('http') ? (
                          `${an.description.slice(0, 110)}...`
                        ) : (
                          <span style={{ fontStyle: 'italic', color: TOKENS.color.muted }}>No sourced summary</span>
                        )}
                      </p>
                    </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Grounded KB Citations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    color: TOKENS.color.muted,
                  }}
                >
                  Knowledge base citations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {agentCatalogStatus === 'loading' ? (
                    <Skeleton lines={3} height={18} label="Loading knowledge base citations" />
                  ) : agentCatalogStatus === 'error' ? (
                    <div style={{ fontSize: '14px', color: TOKENS.color.redOrange }}>
                      Could not load knowledge base file (/kb.json).
                    </div>
                  ) : kbCitations.length === 0 ? (
                    <div style={{ fontSize: '14px', color: TOKENS.color.muted }}>
                      No knowledge base citations matched.
                    </div>
                  ) : (
                    kbCitations.map((cit, i) => (
                    <div
                      key={i}
                      style={{
                        borderTop: `1px solid ${TOKENS.color.hairline}`,
                        paddingTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: TOKENS.color.text, fontFamily: TOKENS.font.heading }}>
                          {cit.title}
                        </div>
                        {cit.needs_verification && (
                          <span
                            style={{
                              fontFamily: TOKENS.font.sans,
                              fontSize: '14px',
                              fontWeight: 500,
                              color: TOKENS.color.muted,
                              flexShrink: 0,
                            }}
                          >
                            Unverified
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4 }}>
                        {cit.summary.slice(0, 120)}...
                      </p>
                    </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </ErrorBoundary>
  )
}
