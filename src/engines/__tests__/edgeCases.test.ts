import { describe, it, expect } from 'vitest'
import { stepRadiationDose } from '../dose'
import { dijkstraRerouting, kruskalMST, primMST, bellmanFord, computeCompositeWeight } from '../routing'
import { dsaturColoring, chromaticPolynomial, evaluatePolynomial } from '../colouring'
import { findEulerTour } from '../euler'
import { computeDerangementsCount, generateDerangementPermutation } from '../derangement'
import { computeRookPolynomial } from '../rook'
import { countMonotonePaths } from '../routeCount'
import { failureProbGivenSeverity, exactTwoTerminalUnreliability } from '../failureProb'
import { computeFailureDistributionPGF } from '../pgf'
import { getFlareClass } from '../flareClassification'
import { formatNumberString } from '../../utils/format'

describe('Edge-Case & Invariant Guards', () => {
  describe('Dose Engine Guards (dose.ts)', () => {
    it('returns zero increment without clamping when radiationRate (solar_flux) <= 0', () => {
      const resZero = stepRadiationDose({
        currentDose: 15.5,
        radiationRate: 0,
        skyViewFactor: 0.8,
        dtSeconds: 60,
      })
      expect(resZero.doseIncrement).toBe(0)
      expect(resZero.dose).toBe(15.5)
      expect(resZero.isCapped).toBe(false)

      const resNeg = stepRadiationDose({
        currentDose: 15.5,
        radiationRate: -5.0,
        skyViewFactor: 0.8,
        dtSeconds: 60,
      })
      expect(resNeg.doseIncrement).toBe(0)
      expect(resNeg.dose).toBe(15.5)
    })

    it('handles NaN gracefully in dose stepping', () => {
      const resNaN = stepRadiationDose({
        currentDose: 10.0,
        radiationRate: NaN,
        skyViewFactor: 0.8,
        dtSeconds: 60,
      })
      expect(resNaN.doseIncrement).toBe(0)
      expect(resNaN.dose).toBe(10.0)
    })
  })

  describe('Routing & Graph Edge Cases (routing.ts)', () => {
    it('returns explicit unreachable result when Dijkstra destination cannot be reached', () => {
      // Disconnected graph: node 0 connected to 1, but node 2 is isolated
      const edges = [{ u: 0, v: 1, latencyMs: 50, pFail: 0.05 }]
      const res = dijkstraRerouting(3, edges, 0, 2)
      expect(res.unreachable).toBe(true)
      expect(res.cost).toBe(Infinity)
      expect(res.path).toEqual([])
    })

    it('handles empty graph in Dijkstra gracefully', () => {
      const resEmpty = dijkstraRerouting(0, [], 0, 0)
      expect(resEmpty.unreachable).toBe(true)
      expect(resEmpty.cost).toBe(Infinity)
      expect(resEmpty.path).toEqual([])
    })

    it('handles empty graph in Kruskal and Prim MST algorithms', () => {
      const kRes0 = kruskalMST(0, [])
      expect(kRes0.totalWeight).toBe(0)
      expect(kRes0.mstEdges).toEqual([])

      const kRes1 = kruskalMST(1, [])
      expect(kRes1.totalWeight).toBe(0)
      expect(kRes1.mstEdges).toEqual([])

      const pRes0 = primMST(0, [])
      expect(pRes0.totalWeight).toBe(0)
      expect(pRes0.mstEdges).toEqual([])

      const pRes1 = primMST(1, [])
      expect(pRes1.totalWeight).toBe(0)
      expect(pRes1.mstEdges).toEqual([])
    })

    it('handles empty graph in Bellman-Ford gracefully', () => {
      const bf0 = bellmanFord(0, [], 0)
      expect(bf0).toEqual([])
    })

    it('handles NaN in computeCompositeWeight without throwing', () => {
      const w = computeCompositeWeight(NaN, NaN)
      expect(Number.isFinite(w) || isNaN(w)).toBe(true)
    })
  })

  describe('Graph Coloring & Tours on Empty Inputs (colouring.ts & euler.ts)', () => {
    it('handles empty graph in DSATUR colouring', () => {
      const c0 = dsaturColoring(0, [])
      expect(c0.numColors).toBe(0)
      expect(c0.colors).toEqual([])
    })

    it('handles 0 nodes in chromaticPolynomial', () => {
      const p0 = chromaticPolynomial(0, [])
      expect(evaluatePolynomial(p0, 1)).toBe(1)
      expect(evaluatePolynomial(p0, 5)).toBe(1)
    })

    it('handles empty graphs in Euler tour check and extraction', () => {
      const tourRes = findEulerTour(0, [])
      expect(tourRes.exists).toBe(true)
      expect(tourRes.tour).toEqual([])
    })
  })

  describe('Combinatorics & Math Engine Edge Cases', () => {
    it('handles 0 and negative inputs in derangements', () => {
      expect(computeDerangementsCount(0)).toBe(1)
      expect(() => computeDerangementsCount(-1)).toThrow()
      expect(() => generateDerangementPermutation(0)).toThrow()
      expect(() => generateDerangementPermutation(1)).toThrow()
    })

    it('handles empty board in rook polynomials', () => {
      const poly = computeRookPolynomial(0, [])
      expect(poly).toEqual([1])
    })

    it('handles empty grid and blocked starts in countMonotonePaths', () => {
      expect(countMonotonePaths(1, 1)).toBe(1)
      expect(countMonotonePaths(3, 3, new Set(['0,0']))).toBe(0)
    })

    it('handles empty array and NaN in failure probability and PGF', () => {
      expect(failureProbGivenSeverity({ pDrag: 0, pCharging: 0, pRadiation: 0 })).toBe(0)
      expect(exactTwoTerminalUnreliability(2, [], 0, 1, 0.5)).toBe(1)
      expect(computeFailureDistributionPGF([])).toEqual([1.0])
      expect(computeFailureDistributionPGF([NaN])).toEqual([1.0, 0.0])
    })

    it('handles flareClassification edge cases', () => {
      expect(getFlareClass(-100)).toBeNull()
      expect(getFlareClass(0)).toBeNull()
      expect(getFlareClass(NaN)).toBeNull()
      expect(getFlareClass(Infinity)).toBeNull()
    })
  })

  describe('UI formatNumber Helper (format.tsx)', () => {
    it('returns fallback em dash with tooltip for NaN, null, undefined, Infinity', () => {
      expect(formatNumberString(NaN)).toBe('—')
      expect(formatNumberString(null)).toBe('—')
      expect(formatNumberString(undefined)).toBe('—')
      expect(formatNumberString(Infinity)).toBe('—')
      expect(formatNumberString(-Infinity)).toBe('—')
    })

    it('formats valid numbers with specified decimal places and optional units', () => {
      expect(formatNumberString(42.678, 1)).toBe('42.7')
      expect(formatNumberString(42.678, 2, 'km')).toBe('42.68 km')
      expect(formatNumberString(0, 0, 'IDU')).toBe('0 IDU')
    })
  })
})
