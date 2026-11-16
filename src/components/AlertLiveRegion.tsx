import React, { useEffect, useRef, useState } from 'react'
import { useHelioStore } from '../store/helioStore'
import { COST_LOSS_RATIO, NOAA_S1_THRESHOLD } from '../config/thresholds'

function formatAlertStatusLabel(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmed'
    case 'WATCH':
      return 'Watch'
    case 'RESOLVED':
      return 'Resolved'
    case 'FALSE_ALARM':
      return 'False alarm'
    default:
      return 'Idle'
  }
}

/**
 * Announces alert status changes via an aria-live assertive region
 * ("Alert is now Confirmed", "Alert is now Watch", etc.).
 */
export function AlertLiveRegion(): React.ReactElement {
  const scene = useHelioStore((s) => s.scene)
  const alertStatus = useHelioStore((s) => s.alert.status)
  const activeRow = useHelioStore((s) => s.activeRow)
  const pProton = useHelioStore((s) => s.forecast.pProton)
  const surface = useHelioStore((s) => s.surface)

  let effectiveStatus = alertStatus
  if (scene === 'surface') {
    const p10 = activeRow?.obs.p10 ?? 0
    if (p10 >= NOAA_S1_THRESHOLD.value) {
      effectiveStatus = 'CONFIRMED'
    } else if (pProton >= COST_LOSS_RATIO.value) {
      effectiveStatus = 'WATCH'
    } else if (alertStatus === 'RESOLVED' || (surface.cumulativeDose > 0 && surface.isSheltered)) {
      effectiveStatus = 'RESOLVED'
    } else if (alertStatus === 'FALSE_ALARM') {
      effectiveStatus = 'FALSE_ALARM'
    } else {
      effectiveStatus = 'WATCH'
    }
  }

  const prevStatusRef = useRef<string>(effectiveStatus)
  const [announcement, setAnnouncement] = useState<string>('')

  useEffect(() => {
    if (scene !== 'orbit' && scene !== 'surface') {
      prevStatusRef.current = effectiveStatus
      return
    }
    if (effectiveStatus !== prevStatusRef.current) {
      prevStatusRef.current = effectiveStatus
      setAnnouncement(`Alert is now ${formatAlertStatusLabel(effectiveStatus)}`)
    }
  }, [effectiveStatus, scene])

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
      data-testid="alert-live-region"
    >
      {announcement}
    </div>
  )
}
