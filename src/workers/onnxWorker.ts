import type * as OrtType from 'onnxruntime-web'

function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

let ortModulePromise: Promise<typeof OrtType> | null = null

async function getOrt(): Promise<typeof OrtType> {
  if (!ortModulePromise) {
    ortModulePromise = import('onnxruntime-web').then((ort) => {
      // Serve WASM files locally from public/onnx-wasm/ with zero CDN usage
      ort.env.wasm.wasmPaths = `${getBaseUrl()}onnx-wasm/`
      // Use single-threaded mode for maximum worker compatibility (no COOP/COEP isolation requirements)
      ort.env.wasm.numThreads = 1
      return ort
    })
  }
  return ortModulePromise
}

let session: OrtType.InferenceSession | null = null
let isIllustrative = true
let isFlareTrained = false

export interface OnnxWorkerMessage {
  type: 'INIT' | 'INFER'
  payload?: {
    inputWindow?: number[] // flat 360 elements for [1, 24, 15]
    modelUrl?: string
    cardUrl?: string
  }
}

self.onmessage = async (e: MessageEvent<OnnxWorkerMessage>) => {
  const { type, payload } = e.data
  const base = getBaseUrl()

  if (type === 'INIT') {
    const modelUrl = payload?.modelUrl || `${base}models/helionet.onnx`
    const cardUrl = payload?.cardUrl || `${base}models/model_card.json`

    try {
      // 1. Fetch model_card.json to determine model provenance
      let cardIllustrative = true
      let flareTrained = false
      try {
        const cardRes = await fetch(cardUrl)
        if (cardRes.ok) {
          const cardData = await cardRes.json()
          cardIllustrative = !!cardData.illustrative
          flareTrained = cardData.flare_trained !== false && cardData.heads?.solar_flare?.status !== 'not_trained'
        }
      } catch {
        // Fallback default
        cardIllustrative = true
        flareTrained = false
      }
      isIllustrative = cardIllustrative
      isFlareTrained = flareTrained

      // 2. Fetch ONNX model buffer before lazily loading runtime
      const modelRes = await fetch(modelUrl)
      const contentType = modelRes.headers.get('content-type') || ''
      if (!modelRes.ok || contentType.includes('text/html')) {
        throw new Error(`Model file not found: status ${modelRes.status}`)
      }
      const arrayBuffer = await modelRes.arrayBuffer()

      // 3. Lazy-load onnxruntime-web only when model buffer is ready
      const ort = await getOrt()
      session = await ort.InferenceSession.create(arrayBuffer)

      self.postMessage({
        type: 'INIT_SUCCESS',
        badge: isIllustrative ? 'ILLUSTRATIVE MODEL' : 'ONNX MODEL',
        isIllustrative,
      })
    } catch (err: any) {
      session = null
      self.postMessage({
        type: 'INIT_FAILURE',
        badge: 'PRECOMPUTED',
        error: err?.message || String(err),
      })
    }
  } else if (type === 'INFER') {
    if (!session) {
      self.postMessage({
        type: 'INFER_FAILURE',
        badge: 'PRECOMPUTED',
        error: 'Model not initialized',
      })
      return
    }

    try {
      const windowData = payload?.inputWindow ?? []
      if (windowData.length !== 360) {
        throw new Error(`Expected 360 values for [1, 24, 15], received ${windowData.length}`)
      }

      const ort = await getOrt()
      const floatArray = new Float32Array(windowData)
      const tensor = new ort.Tensor('float32', floatArray, [1, 24, 15])

      const t0 = performance.now()
      const results = await session.run({ input: tensor })
      const t1 = performance.now()
      const inferenceTimeMs = Math.round((t1 - t0) * 100) / 100

      const outTensor = results.output ?? results[Object.keys(results)[0]]
      const outValues = Array.from(outTensor.data as Float32Array)

      // Ensure outputs are in [0, 1]
      const pGeo = Math.max(0, Math.min(1, outValues[0] ?? 0))
      const pProton = Math.max(0, Math.min(1, outValues[1] ?? 0))
      const rawFlare = outValues[2] ?? -1
      const pFlare = (!isFlareTrained || rawFlare < 0) ? null : Math.max(0, Math.min(1, rawFlare))

      self.postMessage({
        type: 'INFER_SUCCESS',
        pGeo,
        pProton,
        pFlare,
        inferenceTimeMs,
        badge: isIllustrative ? 'ILLUSTRATIVE MODEL' : 'ONNX MODEL',
      })
    } catch (err: any) {
      self.postMessage({
        type: 'INFER_FAILURE',
        badge: 'PRECOMPUTED',
        error: err?.message || String(err),
      })
    }
  }
}
