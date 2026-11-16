import React from 'react'

export interface SkeletonProps {
  lines?: number
  height?: number
  gap?: number
  widths?: string[]
  label?: string
}

/**
 * Accessible skeleton placeholder rows for panels and tables while files load.
 */
export function Skeleton({
  lines = 3,
  height = 14,
  gap = 10,
  widths,
  label = 'Loading content',
}: SkeletonProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
        width: '100%',
      }}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, idx) => {
        const defaultWidth = idx === 0 ? '88%' : idx === lines - 1 ? '62%' : '100%'
        const w = widths?.[idx] ?? defaultWidth
        return (
          <div
            key={idx}
            aria-hidden="true"
            className="helio-skeleton-bar"
            style={{
              width: w,
              height: `${height}px`,
            }}
          />
        )
      })}
    </div>
  )
}
