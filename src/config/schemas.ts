/**
 * Hand-written runtime data contracts and schema validators for HelioNet.
 * Zero external dependencies (no Zod).
 * Returns { ok, data, errors: [{ file, path, message }] }.
 */

export interface ValidationError {
  file: string
  path: string
  message: string
}

export interface ValidationResult<T> {
  ok: boolean
  data?: T
  errors: ValidationError[]
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)
}

function isString(val: unknown): val is string {
  return typeof val === 'string'
}

/* =========================================================================
   1. Replay File Schema
   ========================================================================= */

export interface ReplayRowObs {
  xray: number
  p10: number
  kp: number
  dst: number
  vsw: number
  bz: number
}

export interface ReplayRowForecast {
  pFlare: number | null
  pProton: number
  pGeo: number
  leadH: number
}

export interface ReplayRowSchema {
  t: number
  obs: ReplayRowObs
  forecast: ReplayRowForecast
}

export interface ReplayFileSchema {
  schemaVersion?: string
  event_id: string
  name: string
  label: string
  rows: ReplayRowSchema[]
}

export function validateReplayFile(data: unknown, file = 'replay.json'): ValidationResult<ReplayFileSchema> {
  const errors: ValidationError[] = []

  if (!isObject(data)) {
    return { ok: false, errors: [{ file, path: '$', message: 'Expected JSON object at root' }] }
  }

  if (!isString(data.event_id) || data.event_id.trim() === '') {
    errors.push({ file, path: '$.event_id', message: 'Missing or empty string event_id' })
  }
  if (!isString(data.name) || data.name.trim() === '') {
    errors.push({ file, path: '$.name', message: 'Missing or empty string name' })
  }
  if (!isString(data.label)) {
    errors.push({ file, path: '$.label', message: 'Missing or invalid string label' })
  }

  if (!Array.isArray(data.rows) || data.rows.length === 0) {
    errors.push({ file, path: '$.rows', message: 'Expected non-empty array of replay rows' })
  } else {
    data.rows.forEach((row, idx) => {
      const p = `$.rows[${idx}]`
      if (!isObject(row)) {
        errors.push({ file, path: p, message: 'Row must be an object' })
        return
      }

      if (!isNumber(row.t) || row.t < 0) {
        errors.push({ file, path: `${p}.t`, message: 'Row t must be non-negative finite number' })
      }

      if (!isObject(row.obs)) {
        errors.push({ file, path: `${p}.obs`, message: 'Missing obs object' })
      } else {
        const obs = row.obs
        for (const k of ['xray', 'p10', 'kp', 'dst', 'vsw', 'bz'] as const) {
          if (!isNumber(obs[k])) {
            errors.push({ file, path: `${p}.obs.${k}`, message: `Missing or invalid finite number for ${k}` })
          }
        }
      }

      if (!isObject(row.forecast)) {
        errors.push({ file, path: `${p}.forecast`, message: 'Missing forecast object' })
      } else {
        const fc = row.forecast
        if (fc.pFlare !== null && (!isNumber(fc.pFlare) || fc.pFlare < 0 || fc.pFlare > 1)) {
          errors.push({ file, path: `${p}.forecast.pFlare`, message: 'pFlare must be probability in [0, 1] or null' })
        }
        for (const k of ['pProton', 'pGeo'] as const) {
          if (!isNumber(fc[k]) || fc[k] < 0 || fc[k] > 1) {
            errors.push({ file, path: `${p}.forecast.${k}`, message: `${k} must be probability in [0, 1]` })
          }
        }
        if (!isNumber(fc.leadH) || fc.leadH < 0) {
          errors.push({ file, path: `${p}.forecast.leadH`, message: 'leadH must be non-negative finite number' })
        }
      }
    })
  }

  return {
    ok: errors.length === 0,
    data: errors.length === 0 ? (data as unknown as ReplayFileSchema) : undefined,
    errors,
  }
}

/* =========================================================================
   2. Validation File Schema
   ========================================================================= */

export interface DocumentedOutcomeItem {
  field: string
  value: string | number | null
  source: string
  domain: string
}

export interface ValidationFileSchema {
  schemaVersion?: string
  event: string
  event_id: string
  note: string
  documented_outcome: DocumentedOutcomeItem[]
}

export function validateValidationFile(data: unknown, file = 'validation.json'): ValidationResult<ValidationFileSchema> {
  const errors: ValidationError[] = []

  if (!isObject(data)) {
    return { ok: false, errors: [{ file, path: '$', message: 'Expected JSON object at root' }] }
  }

  if (!isString(data.event) || data.event.trim() === '') {
    errors.push({ file, path: '$.event', message: 'Missing or empty string event' })
  }
  if (!isString(data.event_id) || data.event_id.trim() === '') {
    errors.push({ file, path: '$.event_id', message: 'Missing or empty string event_id' })
  }
  if (!isString(data.note)) {
    errors.push({ file, path: '$.note', message: 'Missing or invalid string note' })
  }

  if (!Array.isArray(data.documented_outcome)) {
    errors.push({ file, path: '$.documented_outcome', message: 'Expected documented_outcome array' })
  } else {
    data.documented_outcome.forEach((item, idx) => {
      const p = `$.documented_outcome[${idx}]`
      if (!isObject(item)) {
        errors.push({ file, path: p, message: 'Item must be an object' })
        return
      }
      if (!isString(item.field) || item.field.trim() === '') {
        errors.push({ file, path: `${p}.field`, message: 'Missing or empty field string' })
      }
      if (item.value !== null && typeof item.value !== 'string' && typeof item.value !== 'number') {
        errors.push({ file, path: `${p}.value`, message: 'value must be string, number, or null' })
      }
      if (!isString(item.source)) {
        errors.push({ file, path: `${p}.source`, message: 'source must be string' })
      }
      if (!isString(item.domain)) {
        errors.push({ file, path: `${p}.domain`, message: 'domain must be string' })
      }
    })
  }

  return {
    ok: errors.length === 0,
    data: errors.length === 0 ? (data as unknown as ValidationFileSchema) : undefined,
    errors,
  }
}

/* =========================================================================
   3. Knowledge Base (kb.json) Schema
   ========================================================================= */

export interface KBEntrySchema {
  schemaVersion?: string
  id: string
  title: string
  summary: string
  source: string
  needs_verification: boolean
}

export function validateKBCatalog(data: unknown, file = 'kb.json'): ValidationResult<KBEntrySchema[]> {
  const errors: ValidationError[] = []

  if (!Array.isArray(data)) {
    return { ok: false, errors: [{ file, path: '$', message: 'Expected JSON array at root' }] }
  }

  data.forEach((entry, idx) => {
    const p = `$[${idx}]`
    if (!isObject(entry)) {
      errors.push({ file, path: p, message: 'Entry must be an object' })
      return
    }
    if (!isString(entry.id) || entry.id.trim() === '') {
      errors.push({ file, path: `${p}.id`, message: 'Missing or empty string id' })
    }
    if (!isString(entry.title) || entry.title.trim() === '') {
      errors.push({ file, path: `${p}.title`, message: 'Missing or empty string title' })
    }
    if (!isString(entry.summary) || entry.summary.trim() === '') {
      errors.push({ file, path: `${p}.summary`, message: 'Missing or empty string summary' })
    }
    if (!isString(entry.source)) {
      errors.push({ file, path: `${p}.source`, message: 'Missing string source' })
    }
    if (typeof entry.needs_verification !== 'boolean') {
      errors.push({ file, path: `${p}.needs_verification`, message: 'needs_verification must be boolean' })
    }
  })

  return {
    ok: errors.length === 0,
    data: errors.length === 0 ? (data as KBEntrySchema[]) : undefined,
    errors,
  }
}

/* =========================================================================
   4. Events Index (events_index.json) Schema
   ========================================================================= */

export interface EventIndexMetrics {
  maxKp: number
  minDst: number
  satellitesLost?: number
  scale: string
  [key: string]: string | number | undefined
}

export interface EventIndexEntrySchema {
  schemaVersion?: string
  id: string
  name: string
  date: string
  description: string
  source: string
  embedding: number[]
  metrics: EventIndexMetrics
}

export function validateEventsIndex(data: unknown, file = 'events_index.json'): ValidationResult<EventIndexEntrySchema[]> {
  const errors: ValidationError[] = []

  if (!Array.isArray(data)) {
    return { ok: false, errors: [{ file, path: '$', message: 'Expected JSON array at root' }] }
  }

  data.forEach((entry, idx) => {
    const p = `$[${idx}]`
    if (!isObject(entry)) {
      errors.push({ file, path: p, message: 'Entry must be an object' })
      return
    }
    if (!isString(entry.id) || entry.id.trim() === '') {
      errors.push({ file, path: `${p}.id`, message: 'Missing or empty string id' })
    }
    if (!isString(entry.name) || entry.name.trim() === '') {
      errors.push({ file, path: `${p}.name`, message: 'Missing or empty string name' })
    }
    if (!isString(entry.date)) {
      errors.push({ file, path: `${p}.date`, message: 'Missing string date' })
    }
    if (!isString(entry.description)) {
      errors.push({ file, path: `${p}.description`, message: 'Missing string description' })
    }
    if (!isString(entry.source)) {
      errors.push({ file, path: `${p}.source`, message: 'Missing string source' })
    }
    if (!Array.isArray(entry.embedding) || (entry.embedding.length !== 15 && entry.embedding.length !== 64) || !entry.embedding.every(isNumber)) {
      errors.push({ file, path: `${p}.embedding`, message: 'embedding must be array of 15 or 64 finite numbers' })
    }
    if (!isObject(entry.metrics)) {
      errors.push({ file, path: `${p}.metrics`, message: 'Missing metrics object' })
    } else {
      const m = entry.metrics
      if (!isNumber(m.maxKp)) errors.push({ file, path: `${p}.metrics.maxKp`, message: 'maxKp must be finite number' })
      if (!isNumber(m.minDst)) errors.push({ file, path: `${p}.metrics.minDst`, message: 'minDst must be finite number' })
      if (m.satellitesLost !== undefined && !isNumber(m.satellitesLost)) {
        errors.push({ file, path: `${p}.metrics.satellitesLost`, message: 'satellitesLost must be number if provided' })
      }
      if (!isString(m.scale)) errors.push({ file, path: `${p}.metrics.scale`, message: 'scale must be string' })
    }
  })

  return {
    ok: errors.length === 0,
    data: errors.length === 0 ? (data as EventIndexEntrySchema[]) : undefined,
    errors,
  }
}

/* =========================================================================
   5. Calibration File (calibration.json) Schema
   ========================================================================= */

export interface CalibrationBin {
  raw_min: number
  raw_max: number
  calibrated: number
}

export interface HazardCalibration {
  method: string
  bins: CalibrationBin[]
  platt_a?: number
  platt_b?: number
}

export interface CalibrationFileSchema {
  schemaVersion?: string
  _comment?: string
  flare_m_class: HazardCalibration
  proton_s1: HazardCalibration
  geomagnetic_g1: HazardCalibration
}

export function validateCalibrationFile(data: unknown, file = 'calibration.json'): ValidationResult<CalibrationFileSchema> {
  const errors: ValidationError[] = []

  if (!isObject(data)) {
    return { ok: false, errors: [{ file, path: '$', message: 'Expected JSON object at root' }] }
  }

  for (const hazard of ['flare_m_class', 'proton_s1', 'geomagnetic_g1'] as const) {
    const p = `$.${hazard}`
    if (!isObject(data[hazard])) {
      errors.push({ file, path: p, message: `Missing hazard calibration object for ${hazard}` })
      continue
    }
    const h = data[hazard] as Record<string, unknown>
    if (!isString(h.method)) {
      errors.push({ file, path: `${p}.method`, message: 'Missing method string' })
    }
    if (!Array.isArray(h.bins) || h.bins.length === 0) {
      errors.push({ file, path: `${p}.bins`, message: 'Missing non-empty bins array' })
    } else {
      h.bins.forEach((bin, bIdx) => {
        const bp = `${p}.bins[${bIdx}]`
        if (!isObject(bin)) {
          errors.push({ file, path: bp, message: 'Bin must be an object' })
          return
        }
        if (!isNumber(bin.raw_min) || !isNumber(bin.raw_max) || !isNumber(bin.calibrated)) {
          errors.push({ file, path: bp, message: 'raw_min, raw_max, calibrated must be finite numbers' })
        }
      })
    }
  }

  return {
    ok: errors.length === 0,
    data: errors.length === 0 ? (data as unknown as CalibrationFileSchema) : undefined,
    errors,
  }
}

/* =========================================================================
   6. Model Card (model_card.json) Schema
   ========================================================================= */

export interface ModelCardSchema {
  schemaVersion?: string
  illustrative: boolean
  name: string
  version: string
  description: string
  input_shape: number[]
  output_shape: number[]
  outputs: string[]
  architecture: string
}

export function validateModelCard(data: unknown, file = 'model_card.json'): ValidationResult<ModelCardSchema> {
  const errors: ValidationError[] = []

  if (!isObject(data)) {
    return { ok: false, errors: [{ file, path: '$', message: 'Expected JSON object at root' }] }
  }

  if (typeof data.illustrative !== 'boolean') {
    errors.push({ file, path: '$.illustrative', message: 'illustrative must be boolean' })
  }
  if (!isString(data.name) || data.name.trim() === '') {
    errors.push({ file, path: '$.name', message: 'Missing or empty string name' })
  }
  if (!isString(data.version) || data.version.trim() === '') {
    errors.push({ file, path: '$.version', message: 'Missing or empty string version' })
  }
  if (!isString(data.description)) {
    errors.push({ file, path: '$.description', message: 'Missing string description' })
  }
  if (!Array.isArray(data.input_shape) || !data.input_shape.every(isNumber)) {
    errors.push({ file, path: '$.input_shape', message: 'input_shape must be array of numbers' })
  }
  if (!Array.isArray(data.output_shape) || !data.output_shape.every(isNumber)) {
    errors.push({ file, path: '$.output_shape', message: 'output_shape must be array of numbers' })
  }
  if (!Array.isArray(data.outputs) || !data.outputs.every(isString)) {
    errors.push({ file, path: '$.outputs', message: 'outputs must be array of strings' })
  }
  if (!isString(data.architecture)) {
    errors.push({ file, path: '$.architecture', message: 'Missing string architecture' })
  }

  return {
    ok: errors.length === 0,
    data: errors.length === 0 ? (data as unknown as ModelCardSchema) : undefined,
    errors,
  }
}
