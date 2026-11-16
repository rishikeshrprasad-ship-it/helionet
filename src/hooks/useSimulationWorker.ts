import { useEffect, useRef } from 'react'
import { useHelioStore } from '../store/helioStore'
import { validateReplayFile } from '../config/schemas'
import type { SimulationStatePayload } from '../workers/simulation.worker'

export function useSimulationWorker(): void {
  const workerRef = useRef<Worker | null>(null)
  const setConstellation = useHelioStore((s) => s.setConstellation)
  const setReplay = useHelioStore((s) => s.setReplay)
  const setReplayStatus = useHelioStore((s) => s.setReplayStatus)
  const setDataError = useHelioStore((s) => s.setDataError)
  const reloadTrigger = useHelioStore((s) => s.reloadTrigger)

  // 1. Load initial replay dataset if not loaded
  useEffect(() => {
    let active = true
    setReplayStatus('loading')

    fetch('/replay/feb2022.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Could not load /replay/feb2022.json`)
        return res.json()
      })
      .then((data) => {
        if (!active) return
        const validation = validateReplayFile(data, '/replay/feb2022.json')
        if (!validation.ok) {
          const firstErr = validation.errors[0]
          const msg = `Data validation failed in ${firstErr.file} at ${firstErr.path}: ${firstErr.message}`
          console.error(msg, validation.errors)
          setReplayStatus('error')
          setDataError(msg)
          return
        }
        setReplay(data)
      })
      .catch((err) => {
        if (!active) return
        console.warn('Failed to load replay data, using fallback defaults', err)
        setReplayStatus('error')
        setDataError(`Could not load replay file (/replay/feb2022.json): ${err instanceof Error ? err.message : String(err)}`)
      })

    return () => {
      active = false
    }
  }, [setReplay, setReplayStatus, setDataError, reloadTrigger])

  // 2. Initialize Web Worker
  useEffect(() => {
    if (typeof Worker === 'undefined') return

    try {
      const worker = new Worker(
        new URL('../workers/simulation.worker.ts', import.meta.url),
        { type: 'module' },
      )

      worker.onmessage = (e: MessageEvent<{ type: string; payload: SimulationStatePayload }>) => {
        if (e.data.type === 'STATE_UPDATE') {
          setConstellation(e.data.payload)
        }
      }

      workerRef.current = worker

      return () => {
        worker.terminate()
        workerRef.current = null
      }
    } catch (err) {
      console.warn('Web Worker initialization error:', err)
      return undefined
    }
  }, [setConstellation])

  // 3. Ticking loop (reads directly from getState to eliminate 60 FPS React re-render thrashing)
  useEffect(() => {
    let animFrame: number
    let lastTime = performance.now()
    let lastWorkerTick = performance.now()

    const loop = (now: number) => {
      const deltaSec = Math.min((now - lastTime) / 1000, 0.1) // Cap at 100ms
      lastTime = now

      const store = useHelioStore.getState()
      const { playback, scene, activeRow } = store

      // Advance replay time if playing
      if (playback.playing) {
        // At 1x speed: 1 real second = 0.5 replay hour (smooth progression through 24h event)
        const advanceHours = deltaSec * playback.speed * 0.25
        const nextTime = (playback.currentTimeHours + advanceHours) % (playback.durationHours || 24)
        store.setCurrentTimeHours(nextTime)
      }

      // Tick satellite physics worker at up to 60Hz smoothly
      if (workerRef.current && (scene === 'orbit' || scene === 'landing')) {
        const workerDt = (now - lastWorkerTick) / 1000
        if (workerDt >= 0.016) {
          lastWorkerTick = now
          const kp = activeRow?.obs.kp ?? 2.0
          const f107 = 150
          const ap = Math.max(4, Math.pow(2, kp))
          const dt = playback.playing ? workerDt * playback.speed : workerDt

          const isActionApproved = store.alert.userChoice === 'approved'

          workerRef.current.postMessage({
            type: 'TICK',
            payload: {
              dtSeconds: dt,
              kp,
              f107,
              ap,
              isActionApproved,
            },
          })
        }
      }

      animFrame = requestAnimationFrame(loop)
    }

    animFrame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrame)
  }, [])
}
