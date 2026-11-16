import { mulberry32 } from './random'

/**
 * Feature 19: Derangement Engine.
 * Recurrence: D_n = (n - 1) * (D_{n-1} + D_{n-2})
 * Base cases: D_0 = 1, D_1 = 0.
 * Test check: D_5 = 44.
 */

/**
 * Computes exact count of derangements D_n (permutations with zero fixed points).
 */
export function computeDerangementsCount(n: number): number {
  if (n < 0) throw new Error('n must be non-negative')
  if (n === 0) return 1
  if (n === 1) return 0
  if (n === 2) return 1

  let prev1 = 0 // D_1
  let curr = 1  // D_2

  for (let k = 3; k <= n; k++) {
    const next = (k - 1) * (curr + prev1)
    prev1 = curr
    curr = next
  }

  return curr
}

/**
 * Reassigns tasks among n surviving satellites using a seeded derangement.
 * Guarantees that task[i] != i for all 0 <= i < n.
 */
export function generateDerangementPermutation(n: number, seed: number = 77): number[] {
  if (n <= 1) {
    throw new Error('Derangement is impossible for n <= 1')
  }

  const rng = mulberry32(seed)

  // Sattolo's algorithm generates a single cycle derangement in O(n) time
  const perm = Array.from({ length: n }, (_, i) => i)

  for (let i = n - 1; i > 0; i--) {
    // Choose j uniformly in [0, i - 1] (strictly less than i)
    const j = Math.floor(rng() * i)
    const temp = perm[i]
    perm[i] = perm[j]
    perm[j] = temp
  }

  return perm
}

/**
 * Verifies whether a given permutation is a valid derangement (no fixed points).
 */
export function isDerangement(perm: number[]): boolean {
  for (let i = 0; i < perm.length; i++) {
    if (perm[i] === i) return false
  }
  return true
}
