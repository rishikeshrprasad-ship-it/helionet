import { useEffect, useRef } from 'react'
import { useHelioStore, type SpaceWeatherObs, type ReplayRow } from '../store/helioStore'

/**
 * Extracts 15 space-weather features for a given observation row.
 * 1. xray flux
 * 2. p10 proton flux
 * 3. kp index
 * 4. dst index
 * 5. vsw solar wind speed
 * 6. bz magnetic field component
 * 7-12. Finite-difference rates of change (dxray, dp10, dkp, ddst, dvsw, dbz)
 * 13. Ey solar wind electric field coupling (-vsw * bz * 1e-3)
 * 14. Normalized Dst (dst / 100.0)
 * 15. Normalized Kp (kp / 9.0)
 */
export function extract15Features(obs: SpaceWeatherObs, prevObs?: SpaceWeatherObs): number[] {
  const xray = obs.xray ?? 1e-6
  const p10 = obs.p10 ?? 1.0
  const kp = obs.kp ?? 2.0
  const dst = obs.dst ?? -10.0
  const vsw = obs.vsw ?? 400.0
  const bz = obs.bz ?? 0.0

  const prev = prevObs ?? obs
  const dXray = xray - (prev.xray ?? xray)
  const dP10 = p10 - (prev.p10 ?? p10)
  const dKp = kp - (prev.kp ?? kp)
  const dDst = dst - (prev.dst ?? dst)
  const dVsw = vsw - (prev.vsw ?? vsw)
  const dBz = bz - (prev.bz ?? bz)

  const ey = -(vsw * bz) * 1e-3
  const normDst = dst / 100.0
  const normKp = kp / 9.0

  return [
    xray, p10, kp, dst, vsw, bz,
    dXray, dP10, dKp, dDst, dVsw, dBz,
    ey, normDst, normKp,
  ]
}

/**
 * Builds the flat 360-element array representing [1, 24, 15] from replay rows
 * ending at currentIndex (padded backward with initial row if currentIndex < 23).
 */
export function build24x15InputWindow(rows: ReplayRow[], currentIndex: number): number[] {
  if (!rows || rows.length === 0) {
    return new Array(360).fill(0)
  }

  const windowRows: ReplayRow[] = []
  const targetEnd = Math.max(0, Math.min(currentIndex, rows.length - 1))

  for (let i = 23; i >= 0; i--) {
    const idx = targetEnd - i
    if (idx >= 0) {
      windowRows.push(rows[idx])
    } else {
      // Pad with earliest available row
      windowRows.push(rows[0])
    }
  }

  const flatData: number[] = []
  for (let t = 0; t < 24; t++) {
    const curRow = windowRows[t]
    const prevRow = t > 0 ? windowRows[t - 1] : curRow
    const features15 = extract15Features(curRow.obs, prevRow.obs)
    flatData.push(...features15)
  }

  return flatData
}

export function useModelInference(): { isReady: boolean } {
  const workerRef = useRef<Worker | null>(null)
  const isModelLoadedRef = useRef<boolean>(false)
  const activeRow = useHelioStore((s) => s.activeRow)
  const replay = useHelioStore((s) => s.replay)
  const setForecast = useHelioStore((s) => s.setForecast)

  // 1. Lazy-load the Web Worker on mount
  useEffect(() => {
    let isMounted = true

    try {
      const worker = new Worker(
        new URL('../workers/onnxWorker.ts', import.meta.url),
        { type: 'module' },
      )
      workerRef.current = worker

      worker.onmessage = (e: MessageEvent) => {
        if (!isMounted) return
        const data = e.data

        if (data.type === 'INIT_SUCCESS') {
          isModelLoadedRef.current = true
          setForecast({
            modelBadge: data.badge,
            isPrecomputed: false,
          })
        } else if (data.type === 'INIT_FAILURE') {
          isModelLoadedRef.current = false
          setForecast({
            modelBadge: 'PRECOMPUTED',
            isPrecomputed: true,
          })
        } else if (data.type === 'INFER_SUCCESS') {
          setForecast({
            pGeo: data.pGeo,
            pProton: data.pProton,
            pFlare: data.pFlare,
            inferenceTimeMs: data.inferenceTimeMs,
            modelBadge: data.badge,
            isPrecomputed: false,
          })
        } else if (data.type === 'INFER_FAILURE') {
          setForecast({
            modelBadge: 'PRECOMPUTED',
            isPrecomputed: true,
          })
        }
      }

      // Initialize worker
      const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
      worker.postMessage({
        type: 'INIT',
        payload: {
          modelUrl: `${base}models/helionet.onnx`,
          cardUrl: `${base}models/model_card.json`,
        },
      })
    } catch {
      // If Web Worker instantiation fails (e.g. non-browser environment), fallback safely
      setForecast({
        modelBadge: 'PRECOMPUTED',
        isPrecomputed: true,
      })
    }

    return () => {
      isMounted = false
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [setForecast])

  // 2. Run inference whenever activeRow or replay updates
  useEffect(() => {
    if (!workerRef.current || !isModelLoadedRef.current || !activeRow || !replay) {
      return
    }

    const currentIndex = replay.rows.findIndex((r) => r.t === activeRow.t)
    const inputWindow = build24x15InputWindow(replay.rows, currentIndex >= 0 ? currentIndex : 0)

    workerRef.current.postMessage({
      type: 'INFER',
      payload: { inputWindow },
    })
  }, [activeRow, replay])

  return { isReady: isModelLoadedRef.current }
}
