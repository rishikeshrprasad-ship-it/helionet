/**
 * Feature 12: Probability Generating Function for satellite failure count.
 * G(x) = prod_{i=1}^N ( (1 - p_i) + p_i * x )
 *
 * Expands the polynomial to compute the exact probability distribution:
 * P(K = k) = coefficient of x^k in G(x).
 */

/**
 * Multiplies an existing polynomial by (a0 + a1 * x).
 * poly has length M (degree M - 1), returns length M + 1.
 */
function multiplyLinearFactor(poly: number[], a0: number, a1: number): number[] {
  const result = new Array<number>(poly.length + 1).fill(0)
  for (let i = 0; i < poly.length; i++) {
    result[i] += poly[i] * a0
    result[i + 1] += poly[i] * a1
  }
  return result
}

/**
 * Computes exact discrete probability distribution of total failures
 * across independent components with individual probabilities p_i.
 *
 * @param probabilities Array of failure probabilities [p_1, p_2, ..., p_N]
 * @returns Array where index k is P(K = k failures), length = N + 1
 */
export function computeFailureDistributionPGF(probabilities: number[]): number[] {
  if (probabilities.length === 0) {
    return [1.0]
  }

  // Base polynomial: G_0(x) = 1.0 (degree 0)
  let poly = [1.0]

  for (const p of probabilities) {
    const safeP = Number.isFinite(p) ? p : 0
    const clampedP = Math.max(0, Math.min(1, safeP))
    const q = 1.0 - clampedP
    poly = multiplyLinearFactor(poly, q, clampedP)
  }

  return poly
}

/**
 * Evaluates the generating function G(x) at a given point x.
 */
export function evaluatePGF(probabilities: number[], x: number): number {
  let product = 1.0
  for (const p of probabilities) {
    const clampedP = Math.max(0, Math.min(1, p))
    product *= (1.0 - clampedP) + clampedP * x
  }
  return product
}

/**
 * Computes the expected number of failures: E[K] = sum(p_i) = G'(1).
 */
export function expectedFailures(probabilities: number[]): number {
  return probabilities.reduce((sum, p) => sum + Math.max(0, Math.min(1, p)), 0)
}
