/**
 * Feature 29: Monotone Route Count Engine (Dynamic Programming & Combinatorics).
 * Counts the number of paths from (0, 0) to (targetX, targetY) using only
 * monotone steps (+1, 0) and (0, +1) while strictly avoiding blocked cells.
 *
 * Test requirement:
 * On an unblocked n x n grid (from (0,0) to (n,n)), the total paths equal C(2n, n).
 */

/**
 * Computes exact binomial coefficient C(n, k) = n! / (k! * (n - k)!).
 */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const c = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= c; i++) {
    result = (result * (n - c + i)) / i
  }
  return Math.round(result)
}

/**
 * DP grid path counter avoiding blocked cells.
 *
 * @param width Grid width (x from 0 to width - 1)
 * @param height Grid height (y from 0 to height - 1)
 * @param blockedSet Set of blocked cell keys formatted as "x,y"
 * @param targetX Destination X coordinate (defaults to width - 1)
 * @param targetY Destination Y coordinate (defaults to height - 1)
 */
export function countMonotonePaths(
  width: number,
  height: number,
  blockedSet: Set<string> = new Set(),
  targetX: number = width - 1,
  targetY: number = height - 1,
): number {
  if (blockedSet.has('0,0') || blockedSet.has(`${targetX},${targetY}`)) {
    return 0
  }

  // dp[y][x] stores number of valid monotone paths from (0, 0) to (x, y)
  const dp: number[][] = Array.from({ length: targetY + 1 }, () =>
    new Array<number>(targetX + 1).fill(0),
  )

  dp[0][0] = 1

  for (let y = 0; y <= targetY; y++) {
    for (let x = 0; x <= targetX; x++) {
      if (blockedSet.has(`${x},${y}`)) {
        dp[y][x] = 0
        continue
      }

      if (x > 0) {
        dp[y][x] += dp[y][x - 1]
      }
      if (y > 0) {
        dp[y][x] += dp[y - 1][x]
      }
    }
  }

  return dp[targetY][targetX]
}
