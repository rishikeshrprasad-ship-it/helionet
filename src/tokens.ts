/**
 * Design tokens for HelioNet.
 * Single source of truth — import this everywhere, never hard-code colours.
 */
export const TOKENS = {
  color: {
    background: '#0E0F12',
    surface:    '#16181D',
    hairline:   '#2A2D34',
    text:       '#E8E6E1',
    muted:      '#8B8F98',
    amber:      '#F2A33A',  // Sun and WATCH state only
    slateBlue:  '#7FA6C9',  // Earth, network, information
    redOrange:  '#E5533D',  // Confirmed, lost, danger
    moss:       '#7BAE7F',  // Nominal, resolved, safe
  },
  font: {
    heading: '"Bricolage Grotesque", system-ui, sans-serif',
    sans:    '"IBM Plex Sans", system-ui, sans-serif',
    mono:    '"IBM Plex Mono", "Courier New", monospace',
  },
  radius: {
    panel: '6px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
  panel: {
    background: 'rgba(14, 15, 18, 0.96)',
    border: '1px solid #2A2D34',
    borderRadius: '6px',
    padding: '16px',
  },
  border: {
    hairline: '1px solid #2A2D34',
  },
  transition: {
    fast:     '120ms cubic-bezier(0.25, 1, 0.5, 1)',
    fastExit: '90ms cubic-bezier(0.5, 0, 0.75, 0)',
    base:     '220ms cubic-bezier(0.25, 1, 0.5, 1)',
    baseExit: '165ms cubic-bezier(0.5, 0, 0.75, 0)',
    slow:     '360ms cubic-bezier(0.25, 1, 0.5, 1)',
    slowExit: '270ms cubic-bezier(0.5, 0, 0.75, 0)',
    reduced:  '150ms ease',
    normal:   '220ms cubic-bezier(0.25, 1, 0.5, 1)',
  },
} as const

export type ColorToken = keyof typeof TOKENS.color
