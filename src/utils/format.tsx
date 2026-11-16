import React from 'react'

/**
 * Format helper for numbers across HUD and cards.
 * If value is NaN, null, undefined or +/-Infinity, prints "—" (em dash)
 * with a tooltip "Value not available", preventing "NaN" or "Infinity" in UI.
 */
export function formatNumber(
  val: unknown,
  decimals: number = 1,
  unit?: string,
): React.ReactNode {
  if (
    val === null ||
    val === undefined ||
    typeof val !== 'number' ||
    !Number.isFinite(val)
  ) {
    return (
      <span
        title="Value not available"
        aria-label="Value not available"
        style={{ cursor: 'help' }}
      >
        —
      </span>
    )
  }

  const formatted = val.toFixed(decimals)
  return unit ? `${formatted} ${unit}` : formatted
}

/**
 * String-only version for plain text contexts (e.g. titles or aria labels).
 */
export function formatNumberString(
  val: unknown,
  decimals: number = 1,
  unit?: string,
): string {
  if (
    val === null ||
    val === undefined ||
    typeof val !== 'number' ||
    !Number.isFinite(val)
  ) {
    return '—'
  }

  const formatted = val.toFixed(decimals)
  return unit ? `${formatted} ${unit}` : formatted
}
