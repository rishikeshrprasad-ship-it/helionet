import { describe, it, expect } from 'vitest'
import {
  analyzeLunarBaseNetwork,
  type LunarBaseSite,
} from '../lunarBase'

describe('Lunar Base Optimization Engine (Feature 31)', () => {
  it('performs end-to-end lunar base network analysis', () => {
    const sites: LunarBaseSite[] = [
      { id: 'SHACKLETON_RIM', name: 'Shackleton Rim Alpha', xMeters: 0, yMeters: 0 },
      { id: 'MALAPERT_PEAK', name: 'Malapert Peak Relay', xMeters: 1500, yMeters: 2000 },
      { id: 'DE_GERLACHE', name: 'De Gerlache Base', xMeters: -1200, yMeters: 1800 },
      { id: 'HAWORTH_CRATER', name: 'Haworth Cold Trap Site', xMeters: 400, yMeters: 3200 },
    ]

    // Cycle plus diagonal link
    const linkEdges: [number, number][] = [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
      [0, 3],
    ]

    const frequencies = [
      { symbol: 'POWER_NOMINAL', frequency: 70 },
      { symbol: 'CRYO_TRAP_VOLATILES', frequency: 20 },
      { symbol: 'ROVER_TELEMETRY', frequency: 8 },
      { symbol: 'RADIATION_ALERT', frequency: 2 },
    ]

    const analysis = analyzeLunarBaseNetwork({ sites, linkEdges, siteFrequencies: frequencies })

    // 1. Connectivity
    expect(analysis.connectivity.isFullyConnected).toBe(true)
    expect(analysis.connectivity.componentCount).toBe(1)

    // 2. MST Cable Layout
    expect(analysis.cableLayoutMST.edges.length).toBe(sites.length - 1)
    expect(analysis.cableLayoutMST.totalCableLengthM).toBeGreaterThan(0)

    // 3. Comms Channel Allocation (DSATUR)
    expect(analysis.commsChannelAllocation.numColors).toBeGreaterThan(0)
    expect(analysis.commsChannelAllocation.colors.length).toBe(sites.length)

    // 4. Telemetry compression
    expect(analysis.telemetryCompression.compressionRatio).toBeGreaterThan(1.0)
  })
})
