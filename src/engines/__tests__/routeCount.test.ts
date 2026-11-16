import { describe, it, expect } from 'vitest'
import { countMonotonePaths, combinations } from '../routeCount'

describe('Monotone Route Count Engine (Feature 29)', () => {
  it('TEST REQUIREMENT: with no blocked cells, path count from (0,0) to (n,n) equals C(2n, n)', () => {
    for (let n = 1; n <= 8; n++) {
      const gridDim = n + 1
      const actualCount = countMonotonePaths(gridDim, gridDim, new Set(), n, n)
      const expectedCombinations = combinations(2 * n, n)
      expect(actualCount).toBe(expectedCombinations)
    }
  })

  it('correctly reduces count when obstacles block routes', () => {
    // 3x3 grid (from 0,0 to 2,2): unblocked has C(4, 2) = 6 paths
    const unblocked = countMonotonePaths(3, 3, new Set(), 2, 2)
    expect(unblocked).toBe(6)

    // Block cell (1, 1) in the center
    const blockedCenter = new Set(['1,1'])
    const withObstacle = countMonotonePaths(3, 3, blockedCenter, 2, 2)
    // Only 2 paths remain: along outer edges (0,0->1,0->2,0->2,1->2,2 and 0,0->0,1->0,2->1,2->2,2)
    expect(withObstacle).toBe(2)

    // Block target cell
    const blockedTarget = new Set(['2,2'])
    expect(countMonotonePaths(3, 3, blockedTarget, 2, 2)).toBe(0)
  })
})
