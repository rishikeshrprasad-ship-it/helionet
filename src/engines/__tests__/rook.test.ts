import { describe, it, expect } from 'vitest'
import {
  computeRookPolynomial,
  countValidAssignments,
  verifyPigeonholeCapacity,
  type BoardPosition,
} from '../rook'

describe('Rook Polynomial & Assignment Engine (Feature 30)', () => {
  it('TEST REQUIREMENT: for n = 3 with forbidden diagonal, valid assignments = 2', () => {
    // 3x3 board where all diagonal squares (0,0), (1,1), (2,2) are forbidden
    // This represents derangements of 3 elements: D_3 = 2
    const n = 3
    const forbiddenDiagonal: BoardPosition[] = [
      { r: 0, c: 0 },
      { r: 1, c: 1 },
      { r: 2, c: 2 },
    ]

    const rookPoly = computeRookPolynomial(n, forbiddenDiagonal)
    // For 3 disjoint squares: R(B, x) = (1 + x)^3 = 1 + 3x + 3x^2 + x^3
    expect(rookPoly[0]).toBe(1)
    expect(rookPoly[1]).toBe(3)
    expect(rookPoly[2]).toBe(3)
    expect(rookPoly[3]).toBe(1)

    // Valid assignments: 1*3! - 3*2! + 3*1! - 1*0! = 6 - 6 + 3 - 1 = 2
    const validCount = countValidAssignments(n, forbiddenDiagonal)
    expect(validCount).toBe(2)
  })

  it('computes valid assignments for n = 4 with forbidden diagonal (D_4 = 9)', () => {
    const n = 4
    const forbiddenDiagonal: BoardPosition[] = [
      { r: 0, c: 0 },
      { r: 1, c: 1 },
      { r: 2, c: 2 },
      { r: 3, c: 3 },
    ]

    const validCount = countValidAssignments(n, forbiddenDiagonal)
    expect(validCount).toBe(9)
  })

  it('verifies pigeonhole capacity constraint', () => {
    // 5 rovers, 3 shelters with capacities [2, 2, 2] -> total 6 >= 5 (satisfies)
    const check1 = verifyPigeonholeCapacity(5, [2, 2, 2])
    expect(check1.satisfies).toBe(true)
    expect(check1.totalCapacity).toBe(6)
    expect(check1.deficit).toBe(0)

    // 7 rovers, capacities [2, 2, 2] -> total 6 < 7 (deficit = 1)
    const check2 = verifyPigeonholeCapacity(7, [2, 2, 2])
    expect(check2.satisfies).toBe(false)
    expect(check2.deficit).toBe(1)
  })
})
