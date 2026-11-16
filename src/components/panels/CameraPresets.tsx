import React from 'react'
import { useHelioStore, type OrbitCameraPreset } from '../../store/helioStore'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { TOKENS } from '../../tokens'

const PRESETS: Array<{ id: OrbitCameraPreset; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'constellation', label: 'Constellation' },
  { id: 'storm', label: 'Storm front' },
  { id: 'solarSystem', label: 'Solar system' },
]

/**
 * Compact Orbit camera preset selector (Overview, Constellation, Storm front).
 */
export function CameraPresets(): React.ReactElement | null {
  const scene = useHelioStore((s) => s.scene)
  const presentationMode = useHelioStore((s) => s.presentationMode)
  const orbitCameraPreset = useHelioStore((s) => s.orbitCameraPreset)
  const setOrbitCameraPreset = useHelioStore((s) => s.setOrbitCameraPreset)

  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'
  const isTablet = breakpoint === 'tablet'

  if (scene !== 'orbit' || presentationMode) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="Camera presets"
      style={{
        position: 'absolute',
        top: isPhone ? '64px' : '10px',
        ...(isPhone || isTablet
          ? { left: isPhone ? '16px' : '24px' }
          : { left: '50%', transform: 'translateX(-50%)' }),
        zIndex: 36,
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(14, 15, 18, 0.78)',
        border: '1px solid rgba(42, 45, 52, 0.6)',
        borderRadius: '8px',
        padding: '2px',
        gap: '2px',
        height: '36px',
        boxSizing: 'border-box',
      }}
    >
      {PRESETS.map((preset) => {
        const active = orbitCameraPreset === preset.id
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            onClick={() => setOrbitCameraPreset(preset.id)}
            style={{
              height: '30px',
              minHeight: '30px',
              padding: isPhone ? '0 10px' : '0 12px',
              background: active ? '#E8E6E1' : 'transparent',
              color: active ? '#0E0F12' : TOKENS.color.muted,
              border: 'none',
              borderRadius: '6px',
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.2,
              cursor: 'pointer',
              transition: `background-color 120ms cubic-bezier(0.25, 1, 0.5, 1), color 120ms cubic-bezier(0.25, 1, 0.5, 1)`,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#E8E6E1'
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.muted
              }
            }}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
