/**
 * Feature 23 & 32: Propositional Rule Engine & Logic Decision.
 * 1. Evaluates propositional rules with actions and explanations.
 * 2. Truth-table analysis (<= 10 boolean variables):
 *    - Contradictions (e.g., mutually exclusive actions triggered simultaneously)
 *    - Tautologies (antecedents true for all variable assignments)
 *    - Dead rules (antecedents unsatisfiable for all variable assignments)
 * 3. Feature 32 logic decision:
 *    IF alert=CONFIRMED AND exists shelter reachable before deadline THEN go_shelter.
 */

export type BooleanExpr =
  | { type: 'var'; name: string }
  | { type: 'not'; expr: BooleanExpr }
  | { type: 'and'; left: BooleanExpr; right: BooleanExpr }
  | { type: 'or'; left: BooleanExpr; right: BooleanExpr }

export interface PropositionalRule {
  id: string
  name: string
  antecedent: BooleanExpr
  action: string
  justification: string
}

export interface TruthTableAnalysis {
  contradictions: { state: Record<string, boolean>; conflictingActions: string[] }[]
  tautologies: string[]
  deadRules: string[]
}

/**
 * Evaluates a boolean expression given a variable assignment map.
 */
export function evaluateExpr(expr: BooleanExpr, values: Record<string, boolean>): boolean {
  switch (expr.type) {
    case 'var':
      return !!values[expr.name]
    case 'not':
      return !evaluateExpr(expr.expr, values)
    case 'and':
      return evaluateExpr(expr.left, values) && evaluateExpr(expr.right, values)
    case 'or':
      return evaluateExpr(expr.left, values) || evaluateExpr(expr.right, values)
  }
}

/**
 * Collects all unique variable names from an expression.
 */
export function extractVariables(expr: BooleanExpr): Set<string> {
  const vars = new Set<string>()
  function walk(e: BooleanExpr) {
    if (e.type === 'var') {
      vars.add(e.name)
    } else if (e.type === 'not') {
      walk(e.expr)
    } else {
      walk(e.left)
      walk(e.right)
    }
  }
  walk(expr)
  return vars
}

/**
 * Feature 23: Complete truth-table check across at most 10 variables.
 * Detects contradictions, tautological conditions, and dead (unsatisfiable) rules.
 */
export function analyzeRuleSetTruthTable(
  rules: PropositionalRule[],
  mutuallyExclusiveActionPairs: [string, string][] = [],
): TruthTableAnalysis {
  const allVarsSet = new Set<string>()
  for (const r of rules) {
    for (const v of extractVariables(r.antecedent)) {
      allVarsSet.add(v)
    }
  }

  const varList = Array.from(allVarsSet)
  if (varList.length > 10) {
    throw new Error('Truth-table check is bounded to at most 10 variables')
  }

  const numStates = 1 << varList.length
  const ruleSatisfiedCounts = new Array<number>(rules.length).fill(0)
  const contradictions: { state: Record<string, boolean>; conflictingActions: string[] }[] = []

  for (let s = 0; s < numStates; s++) {
    const assignment: Record<string, boolean> = {}
    for (let i = 0; i < varList.length; i++) {
      assignment[varList[i]] = (s & (1 << i)) !== 0
    }

    const firedActions = new Set<string>()

    for (let rIdx = 0; rIdx < rules.length; rIdx++) {
      const isTrue = evaluateExpr(rules[rIdx].antecedent, assignment)
      if (isTrue) {
        ruleSatisfiedCounts[rIdx]++
        firedActions.add(rules[rIdx].action)
      }
    }

    // Check for conflicting actions
    for (const [actA, actB] of mutuallyExclusiveActionPairs) {
      if (firedActions.has(actA) && firedActions.has(actB)) {
        contradictions.push({
          state: assignment,
          conflictingActions: [actA, actB],
        })
      }
    }
  }

  const tautologies: string[] = []
  const deadRules: string[] = []

  for (let rIdx = 0; rIdx < rules.length; rIdx++) {
    const count = ruleSatisfiedCounts[rIdx]
    if (count === numStates && numStates > 0) {
      tautologies.push(rules[rIdx].id)
    } else if (count === 0) {
      deadRules.push(rules[rIdx].id)
    }
  }

  return {
    contradictions,
    tautologies,
    deadRules,
  }
}

/**
 * Fires rules against current operational context, returning first matching action
 * with full provenance / justification.
 */
export function fireRules(
  rules: PropositionalRule[],
  context: Record<string, boolean>,
): { firedRule: PropositionalRule; action: string; justification: string } | null {
  for (const rule of rules) {
    if (evaluateExpr(rule.antecedent, context)) {
      return {
        firedRule: rule,
        action: rule.action,
        justification: rule.justification,
      }
    }
  }
  return null
}

/**
 * Feature 32: Decision predicate:
 * IF alert=CONFIRMED AND exists shelter reachable before the deadline THEN go_shelter.
 * Also evaluates universal quantifier: "for every rover there exists a shelter reachable in time".
 */
export function evaluateRoverShelterDecision(params: {
  alertConfirmed: boolean
  rovers: { id: string; reachableSheltersCount: number }[]
}): {
  action: 'go_shelter' | 'maintain_nominal' | 'shelter_deficit'
  allRoversSafe: boolean
  justification: string
} {
  const { alertConfirmed, rovers } = params

  if (!alertConfirmed) {
    return {
      action: 'maintain_nominal',
      allRoversSafe: true,
      justification: 'Alert is not CONFIRMED; rovers continue nominal scientific survey.',
    }
  }

  // Universal quantification: for every rover, exists shelter reachable
  const allRoversHaveShelter = rovers.every((r) => r.reachableSheltersCount > 0)

  if (allRoversHaveShelter) {
    return {
      action: 'go_shelter',
      allRoversSafe: true,
      justification:
        'Alert CONFIRMED and every active rover has at least one reachable shelter within lead time window. Initiating emergency shelter transit.',
    }
  } else {
    const unsafeRovers = rovers.filter((r) => r.reachableSheltersCount === 0).map((r) => r.id)
    return {
      action: 'shelter_deficit',
      allRoversSafe: false,
      justification: `Alert CONFIRMED but rover(s) [${unsafeRovers.join(', ')}] cannot reach any shelter before storm onset. Initiating emergency terrain shielding.`,
    }
  }
}
