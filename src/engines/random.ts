/**
 * Seeded pseudo-random number generator — mulberry32.
 * Rule 2: engines use seeded random numbers only (no Math.random()).
 *
 * @param seed - 32-bit unsigned integer seed
 * @returns A function that returns a float in [0, 1)
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0
    let z = Math.imul(s ^ (s >>> 15), 1 | s)
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) >>> 0
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
}
