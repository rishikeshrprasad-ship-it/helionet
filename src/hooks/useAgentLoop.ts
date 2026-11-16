import { useEffect, useRef } from 'react'
import { useHelioStore, type AgentStepLog } from '../store/helioStore'
import { searchTopAnalogEvents, searchKnowledgeBase, type EventIndexEntry, type KBEntry } from '../engines/analogSearch'
import { ConfirmationStateMachine } from '../engines/confirmFSM'
import { COST_LOSS_RATIO, NOAA_G1_THRESHOLD } from '../config/thresholds'
import { validateKBCatalog, validateEventsIndex } from '../config/schemas'

export function useAgentLoop(): void {
  const activeRow = useHelioStore((s) => s.activeRow)
  const setAlert = useHelioStore((s) => s.setAlert)
  const setAgentLog = useHelioStore((s) => s.setAgentLog)
  const setAgentCatalogStatus = useHelioStore((s) => s.setAgentCatalogStatus)

  const kbCatalog = useRef<KBEntry[]>([])
  const eventsCatalog = useRef<EventIndexEntry[]>([])
  const fsmRef = useRef<ConfirmationStateMachine | null>(null)

  // 1. Fetch knowledge base and events catalog once
  useEffect(() => {
    let active = true
    setAgentCatalogStatus('loading')

    const fetchJson = async (url: string): Promise<{ ok: boolean; data: unknown }> => {
      try {
        const res = await fetch(url)
        if (!res.ok) return { ok: false, data: [] }
        return { ok: true, data: await res.json() }
      } catch {
        return { ok: false, data: [] }
      }
    }

    Promise.all([fetchJson('/kb.json'), fetchJson('/models/events_index.json')]).then(([kbFetch, eventsFetch]) => {
      if (!active) return
      const kbRes = validateKBCatalog(kbFetch.data, '/kb.json')
      const eventsRes = validateEventsIndex(eventsFetch.data, '/models/events_index.json')

      const kb = kbRes.ok && kbRes.data ? kbRes.data : []
      const events = eventsRes.ok && eventsRes.data ? eventsRes.data : []

      if (!kbRes.ok) {
        console.warn('KB catalog validation warnings:', kbRes.errors)
      }
      if (!eventsRes.ok) {
        console.warn('Events index validation warnings:', eventsRes.errors)
      }

      if (!kbFetch.ok || !eventsFetch.ok) {
        setAgentCatalogStatus('error')
      } else {
        setAgentCatalogStatus('ready')
      }

      kbCatalog.current = kb as unknown as KBEntry[]
      eventsCatalog.current = events as unknown as EventIndexEntry[]

      // Initial analog search with baseline values
      const initialQuery = [0.15, 0.45, 0.65, 0.22, 0.12, 0.58, 0.72, 0.18, 0.35, 0.61, 0.29, 0.44, 0.52, 0.38, 0.25]
      const analogs = searchTopAnalogEvents(initialQuery, eventsCatalog.current, 3).map((a) => ({
        id: a.event.id,
        name: a.event.name,
        date: a.event.date,
        similarity: Math.round(a.similarity * 100) / 100,
        description: a.event.description,
        source: (a.event as unknown as { source?: string }).source ?? '',
      }))
      const citations = searchKnowledgeBase('geomagnetic', kb).map((k) => ({
        title: k.title,
        summary: k.summary,
        source: k.source,
        needs_verification: k.needs_verification ?? !(k.source && k.source.startsWith('http')),
      }))

      setAgentLog({ analogs, kbCitations: citations })
    })

    // Initialize confirmation FSM for geomagnetic storm (cost-loss threshold C/L from config, window = 24h)
    fsmRef.current = new ConfirmationStateMachine({
      hazardType: 'geomagnetic',
      costLossThreshold: COST_LOSS_RATIO.value,
      windowHours: 24.0,
    })

    return () => {
      active = false
    }
  }, [setAgentLog, setAgentCatalogStatus])

  // 2. Autonomous Agent Loop Execution on Replay/Observation Step
  useEffect(() => {
    if (!activeRow || !fsmRef.current) return

    const tStart = performance.now()
    const steps: AgentStepLog[] = []

    try {
      // Step 1: OBSERVE
      const t1 = performance.now()
      const obs = {
        timeHours: activeRow.t,
        xray: activeRow.obs.xray,
        p10: activeRow.obs.p10,
        kp: activeRow.obs.kp,
        dst: activeRow.obs.dst,
        vsw: activeRow.obs.vsw,
        bz: activeRow.obs.bz,
      }
      steps.push({
        step: 'Observe',
        inputs: { timeHours: activeRow.t },
        outputs: { obs },
        ms: Math.round((performance.now() - t1) * 100) / 100,
      })

      // Step 2: ANALYZE / INFERENCE
      const t2 = performance.now()
      const pGeo = activeRow.forecast.pGeo
      const pProton = activeRow.forecast.pProton
      const pFlare = activeRow.forecast.pFlare
      const isGeomagneticHazard = pGeo >= 0.30
      const isProtonHazard = pProton >= 0.20
      const infMs = Math.round((performance.now() - t2) * 100) / 100
      steps.push({
        step: 'Analyze',
        inputs: {
          forecastProbabilities: { pFlare, pProton, pGeo },
          modelBadge: 'PRECOMPUTED',
        },
        outputs: {
          isGeomagneticHazard,
          isProtonHazard,
          leadH: activeRow.forecast.leadH,
          inferenceTimeMs: 'precomputed',
        },
        ms: infMs,
      })

      // Step 3: RESEARCH
      const t3 = performance.now()
      // Create query embedding from normalized observation vector
      const queryVec = [
        obs.kp / 9.0,
        Math.abs(obs.dst) / 200.0,
        obs.vsw / 800.0,
        Math.abs(obs.bz) / 20.0,
        obs.p10 / 50.0,
        pGeo,
        pFlare ?? 0.0,
        pProton,
        0.5, 0.4, 0.3, 0.6, 0.7, 0.5, 0.4,
      ]
      const targetDim = eventsCatalog.current[0]?.embedding?.length ?? 15
      const effectiveQuery = targetDim === 64
        ? Array.from({ length: 64 }, (_, i) => queryVec[i % queryVec.length])
        : queryVec
      const topAnalogs = searchTopAnalogEvents(effectiveQuery, eventsCatalog.current, 3)
      const topCitations = searchKnowledgeBase('geomagnetic', kbCatalog.current)
      steps.push({
        step: 'Research',
        inputs: { queryDimension: queryVec.length, catalogSize: eventsCatalog.current.length },
        outputs: {
          topAnalog: topAnalogs[0]?.event.name ?? 'None',
          similarity: topAnalogs[0]?.similarity ?? 0,
          citationsCount: topCitations.length,
        },
        ms: Math.round((performance.now() - t3) * 100) / 100,
      })

      // Step 4: PLAN
      const t4 = performance.now()
      const actions: string[] = []
      if (isGeomagneticHazard) {
        actions.push('Execute orbital maintenance boost', 'Recalculate secondary Dijkstra mesh routes')
      }
      if (isProtonHazard) {
        actions.push('Signal lunar south pole rovers to navigate to radiation shelters')
      }
      steps.push({
        step: 'Plan',
        inputs: { rulesEvaluated: ['RULE_GEO_LEO_DRAG', 'RULE_PROTON_LUNAR_EVAC'] },
        outputs: { plannedActions: actions },
        ms: Math.round((performance.now() - t4) * 100) / 100,
      })

      // Step 5: ACT
      const t5 = performance.now()
      steps.push({
        step: 'Act',
        inputs: { actionsDispatched: actions.length },
        outputs: { status: 'Dispatched to constellation and surface simulation workers' },
        ms: Math.round((performance.now() - t5) * 100) / 100,
      })

      // Step 6: CONFIRM (State Machine Step)
      const t6 = performance.now()
      const nextFsmState = fsmRef.current.step(pGeo, obs)
      steps.push({
        step: 'Confirm',
        inputs: { fsmCurrentState: nextFsmState, obsKp: obs.kp, threshold: NOAA_G1_THRESHOLD.value },
        outputs: {
          confirmedStatus: nextFsmState,
          transitionHistoryLength: fsmRef.current.history.length,
        },
        ms: Math.round((performance.now() - t6) * 100) / 100,
      })

      // Step 7: REPORT
      const t7 = performance.now()
      const evidence =
        nextFsmState === 'CONFIRMED'
          ? `Observed Kp = ${obs.kp.toFixed(1)} >= ${NOAA_G1_THRESHOLD.value.toFixed(1)} (NOAA G1+ Storm Threshold Crossed)`
          : `Forecast pGeo = ${(pGeo * 100).toFixed(0)}% (C/L Threshold: ${(COST_LOSS_RATIO.value * 100).toFixed(0)}%)`

      steps.push({
        step: 'Report',
        inputs: { nextFsmState, totalLoopMs: Math.round(performance.now() - tStart) },
        outputs: { alertGenerated: true },
        ms: Math.round((performance.now() - t7) * 100) / 100,
      })

      // Update store with alert and agent audit trail
      setAlert({
        visible: true,
        status: nextFsmState,
        probability: pGeo,
        leadTime: activeRow.forecast.leadH,
        evidence,
      })

      setAgentLog({
        steps,
        analogs: topAnalogs.map((a) => ({
          id: a.event.id,
          name: a.event.name,
          date: a.event.date,
          similarity: Math.round(a.similarity * 100) / 100,
          description: a.event.description,
          source: (a.event as unknown as { source?: string }).source ?? '',
        })),
        kbCitations: topCitations.map((k) => ({
          title: k.title,
          summary: k.summary,
          source: k.source,
          needs_verification: k.needs_verification ?? !(k.source && k.source.startsWith('http')),
        })),
      })
    } catch (err) {
      console.warn('Agent Loop Degraded Mode Error:', err)
      steps.push({
        step: 'Report',
        inputs: { error: String(err) },
        outputs: { degradedMode: true },
        ms: Math.round(performance.now() - tStart),
      })
      setAgentLog({ steps })
    }
  }, [activeRow, setAlert, setAgentLog])
}
