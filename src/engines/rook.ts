/**
 * Feature 30: Rook Polynomial & Assignment Engine.
 *
 * Used for allocating rovers to shelters with mutual exclusion and operational constraints.
 * Recurrence:
 *   R(B, x) = R(B - square, x) + x * R(B without its row and column, x)
 *
 * Coefficients:
 *   R(B, x) = sum_{k=0}^n r_k * x^k
 *
 * Number of valid assignments (zero rooks on forbidden board B):
 *   N_valid = sum_{k=0}^n (-1)^k * r_k * (n - k)!
 *
 * Pigeonhole capacity check:
 *   Total agents <= Total shelter slots.
 *
 * Test requirement:
 *   For n = 3 with forbidden diagonal (i, i), valid assignments = 2.
 */

export interface BoardPosition {
  r: number
  c: number
}

function factorial(n: number): number {
  if (n <= 1) return 1
  let f = 1
  for (let i = 2; i <= n; i++) f *= i
  return f
}

/**
 * Feature 30: Computes the rook polynomial coefficients [r_0, r_1, ..., r_n]
 * for a board of forbidden squares B.
 *
 * @param n Size of the board (n x n)
 * @param forbiddenSquares Array of { r, c } coordinates that are forbidden
 */
export function computeRookPolynomial(n: number, forbiddenSquares: BoardPosition[]): number[] {
  // If no forbidden squares, R(empty, x) = 1 (only r_0 = 1)
  if (forbiddenSquares.length === 0) {
    const poly = new Array<number>(n + 1).fill(0)
    poly[0] = 1
    return poly
  }

  // Base case: exactly one forbidden square
  if (forbiddenSquares.length === 1) {
    const poly = new Array<number>(n + 1).fill(0)
    poly[0] = 1
    poly[1] = 1
    return poly
  }

  // Pick the first square s = (r0, c0)
  const s = forbiddenSquares[0]

  // 1. Board without square s: B - s
  const boardWithoutS = forbiddenSquares.slice(1)
  const polyWithoutS = computeRookPolynomial(n, boardWithoutS)

  // 2. Board without row r0 and column c0:
  // Remove all squares having row == s.r or col == s.c
  const boardWithoutRowCol = boardWithoutS.filter(
    (sq) => sq.r !== s.r && sq.c !== s.c,
  )
  const polyWithoutRowCol = computeRookPolynomial(n, boardWithoutRowCol)

  // R(B, x) = R(B - s, x) + x * R(B without row and col, x)
  const result = new Array<number>(n + 1).fill(0)

  // Add R(B - s)
  for (let i = 0; i <= n; i++) {
    result[i] += polyWithoutS[i] || 0
  }

  // Add x * R(B without row and col)
  for (let i = 0; i < n; i++) {
    result[i + 1] += polyWithoutRowCol[i] || 0
  }

  return result
}

/**
 * Computes the exact number of valid non-conflicting assignments:
 * N_valid = sum_{k=0}^n (-1)^k * r_k * (n - k)!
 */
export function countValidAssignments(n: number, forbiddenSquares: BoardPosition[]): number {
  const rookPoly = computeRookPolynomial(n, forbiddenSquares)
  let totalValid = 0

  for (let k = 0; k <= n; k++) {
    const r_k = rookPoly[k] || 0
    if (r_k === 0) continue

    const sign = k % 2 === 0 ? 1 : -1
    const ways = (sign * r_k * factorial(n - k))
    totalValid += ways
  }

  return Math.round(totalValid)
}

/**
 * Pigeonhole capacity check:
 * Verifies that the number of demand units does not exceed available capacity slots.
 */
export function verifyPigeonholeCapacity(
  demandUnitsCount: number,
  capacities: number[],
): { satisfies: boolean; totalCapacity: number; deficit: number } {
  const totalCapacity = capacities.reduce((sum, c) => sum + Math.max(0, c), 0)
  const satisfies = demandUnitsCount <= totalCapacity
  const deficit = satisfies ? 0 : demandUnitsCount - totalCapacity
  return { satisfies, totalCapacity, deficit }
}
