/**
 * Feature 33: Space Weather Validation Engine.
 * Loads validation benchmarks and produces side-by-side comparison tables.
 * Rules:
 * - A field without a source shows "Unverified".
 * - The lunar side is always labelled "Scenario test".
 */

export interface DocumentedOutcomeEntry {
  field: string
  value: string | number
  source?: string
  domain?: 'space' | 'satellite' | 'lunar'
}

export interface ValidationFile {
  event: string
  event_id: string
  note?: string
  documented_outcome: DocumentedOutcomeEntry[]
}

export interface ComparisonRow {
  field: string
  domain: string
  predictedValue: string | number | null
  documentedValue: string | number | null
  source: string
  verified: boolean
  label?: string
}

export function buildValidationComparison(
  validationData: ValidationFile,
  predictedMetrics: Record<string, string | number>,
): ComparisonRow[] {
  const rows: ComparisonRow[] = []

  for (const item of validationData.documented_outcome) {
    const isLunar = item.domain === 'lunar' || item.field.toLowerCase().includes('lunar') || item.field.toLowerCase().includes('rover')
    const hasSource = !!item.source && item.source.trim().length > 0
    const source = hasSource ? item.source! : 'Unverified'

    rows.push({
      field: item.field,
      domain: item.domain ?? 'space',
      predictedValue: predictedMetrics[item.field] ?? 'No data',
      documentedValue: item.value,
      source,
      verified: hasSource,
      label: isLunar ? 'Scenario test' : undefined,
    })
  }

  return rows
}
