import React from 'react'
import { TOKENS } from '../tokens'

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional label shown in the fallback — e.g. "Orbit Scene" */
  label?: string
}

/**
 * Catches render/lifecycle errors in any child subtree.
 * Shows a small inline message — the app never goes blank.
 * Rule 4: every panel and scene must be wrapped in one of these.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    const label = this.props.label ?? 'Component'

    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: TOKENS.color.surface,
          border: `1px solid ${TOKENS.color.hairline}`,
          borderRadius: TOKENS.radius.panel,
          color: TOKENS.color.muted,
          fontFamily: TOKENS.font.sans,
          fontSize: '14px',
          lineHeight: 1.4,
          gap: '6px',
          minHeight: '80px',
        }}
      >
        <span style={{ color: TOKENS.color.redOrange, fontWeight: 500 }}>
          {label} error
        </span>
        <span style={{ maxWidth: '320px', textAlign: 'center' }}>
          {this.state.message || 'Something went wrong. The rest of the app is still running.'}
        </span>
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          style={{
            marginTop: '8px',
            padding: '8px 0',
            minHeight: '44px',
            background: 'transparent',
            border: 'none',
            color: TOKENS.color.text,
            cursor: 'pointer',
            fontFamily: TOKENS.font.sans,
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Retry
        </button>
      </div>
    )
  }
}
