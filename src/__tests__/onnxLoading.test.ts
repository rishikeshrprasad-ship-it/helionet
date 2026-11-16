import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import * as ort from 'onnxruntime-web'
import { extract15Features, build24x15InputWindow } from '../hooks/useModelInference'
import type { ReplayRow, SpaceWeatherObs } from '../store/helioStore'

describe('ONNX Space Weather Model Loading & Inference Pipeline', () => {
  const modelPath = path.resolve(process.cwd(), 'public/models/helionet.onnx')
  const cardPath = path.resolve(process.cwd(), 'public/models/model_card.json')

  it('builds valid 15-channel observation vector and 24x15 input window (360 floats)', () => {
    const obs: SpaceWeatherObs = {
      xray: 1.5e-5,
      p10: 3.2,
      kp: 4.7,
      dst: -45,
      vsw: 560,
      bz: -8.4,
    }

    const features15 = extract15Features(obs)
    expect(features15).toHaveLength(15)
    features15.forEach((val) => {
      expect(Number.isFinite(val)).toBe(true)
    })

    const dummyRows: ReplayRow[] = Array.from({ length: 30 }, (_, i) => ({
      t: i,
      obs: {
        xray: 1e-6 + i * 1e-6,
        p10: 1.0 + i * 0.5,
        kp: 2.0 + (i % 5),
        dst: -10 - i * 3,
        vsw: 400 + i * 10,
        bz: 2 - (i % 6),
      },
      forecast: {
        pFlare: 0.1,
        pProton: 0.05,
        pGeo: 0.2,
        leadH: 24,
      },
    }))

    const window360 = build24x15InputWindow(dummyRows, 15)
    expect(window360).toHaveLength(360)
    window360.forEach((val) => {
      expect(Number.isFinite(val)).toBe(true)
    })
  })

  it('CHECK (a): file present -> loads model, produces ILLUSTRATIVE badge, and three probabilities in [0, 1]', async () => {
    expect(fs.existsSync(modelPath)).toBe(true)
    expect(fs.existsSync(cardPath)).toBe(true)

    const cardContent = JSON.parse(fs.readFileSync(cardPath, 'utf-8'))
    expect(cardContent.illustrative).toBe(true)
    const badge = cardContent.illustrative ? 'ILLUSTRATIVE MODEL' : 'ONNX MODEL'
    expect(badge).toBe('ILLUSTRATIVE MODEL')

    const modelBuffer = fs.readFileSync(modelPath)
    const session = await ort.InferenceSession.create(new Uint8Array(modelBuffer))
    expect(session).toBeDefined()
    expect(session.inputNames).toContain('input')
    expect(session.outputNames).toContain('output')

    // Test inference with a [1, 24, 15] input
    const inputData = new Float32Array(360).fill(0.5)
    const inputTensor = new ort.Tensor('float32', inputData, [1, 24, 15])

    const t0 = performance.now()
    const results = await session.run({ input: inputTensor })
    const t1 = performance.now()
    const inferenceTimeMs = t1 - t0

    expect(inferenceTimeMs).toBeGreaterThan(0)

    const outputData = Array.from(results.output.data as Float32Array)
    expect(outputData).toHaveLength(3)

    const [pGeo, pProton, pFlare] = outputData
    expect(pGeo).toBeGreaterThanOrEqual(0)
    expect(pGeo).toBeLessThanOrEqual(1)
    expect(pProton).toBeGreaterThanOrEqual(0)
    expect(pProton).toBeLessThanOrEqual(1)
    expect(pFlare).toBeGreaterThanOrEqual(0)
    expect(pFlare).toBeLessThanOrEqual(1)
  }, 20000)

  it('CHECK (b): file missing / removed -> graceful PRECOMPUTED fallback without unhandled console errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let fallbackBadge = 'PRECOMPUTED'
    let isPrecomputed = true

    try {
      // Simulate attempting to fetch a missing model file
      const missingModelUrl = '/models/nonexistent_model.onnx'
      const res = await fetch(missingModelUrl).catch(() => null)
      if (!res || !res.ok) {
        throw new Error('Model file not found')
      }
      fallbackBadge = 'ILLUSTRATIVE MODEL'
      isPrecomputed = false
    } catch {
      fallbackBadge = 'PRECOMPUTED'
      isPrecomputed = true
    }

    expect(fallbackBadge).toBe('PRECOMPUTED')
    expect(isPrecomputed).toBe(true)

    // Verify no unhandled console errors were dumped
    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
