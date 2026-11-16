import { findConnectedComponents, type NetworkGraph } from './network'
import { findEulerTour, type EulerTourResult } from './euler'
import { dsaturColoring, type ColouringResult } from './colouring'
import { kruskalMST, type WeightedEdge } from './routing'
import { buildHuffmanCoding, type HuffmanResult, type SymbolFrequency } from './huffman'

export interface LunarBaseSite {
  id: string
  name: string
  xMeters: number
  yMeters: number
}

export interface LunarBaseNetworkAnalysis {
  connectivity: {
    isFullyConnected: boolean
    componentCount: number
  }
  cableLayoutMST: {
    totalCableLengthM: number
    edges: WeightedEdge[]
  }
  commsChannelAllocation: ColouringResult
  inspectionSurveyTour: EulerTourResult
  telemetryCompression: HuffmanResult
}

/**
 * Feature 31: End-to-end Lunar Base Network Optimization Engine.
 * Integrates connectivity, cable layout (MST), radio frequency scheduling (DSATUR),
 * maintenance inspection (Euler tour), and scientific telemetry compression (Huffman).
 */
export function analyzeLunarBaseNetwork(params: {
  sites: LunarBaseSite[]
  linkEdges: [number, number][]
  siteFrequencies: SymbolFrequency[]
}): LunarBaseNetworkAnalysis {
  const { sites, linkEdges, siteFrequencies } = params
  const numNodes = sites.length

  // 1. Build adjacency list
  const adj: number[][] = Array.from({ length: numNodes }, () => [])
  const weightedEdges: WeightedEdge[] = []

  for (const [u, v] of linkEdges) {
    adj[u].push(v)
    adj[v].push(u)

    const dx = sites[u].xMeters - sites[v].xMeters
    const dy = sites[u].yMeters - sites[v].yMeters
    const dist = Math.sqrt(dx * dx + dy * dy)

    weightedEdges.push({
      u,
      v,
      latencyMs: dist / 300000.0, // Speed of light in vacuum (km/s -> m/ms)
      pFail: 0.01,
    })
  }

  const graph: NetworkGraph = {
    numNodes,
    adjacencyList: adj,
  }

  // 2. Connectivity check
  const comp = findConnectedComponents(graph)

  // 3. MST Cable layout
  const mst = kruskalMST(numNodes, weightedEdges, 0)

  // 4. Comms frequency slot colouring
  const coloring = dsaturColoring(numNodes, adj)

  // 5. Inspection survey tour
  const surveyTour = findEulerTour(numNodes, linkEdges)

  // 6. Telemetry compression
  const telemetry = buildHuffmanCoding(siteFrequencies)

  return {
    connectivity: {
      isFullyConnected: comp.isFullyConnected,
      componentCount: comp.numComponents,
    },
    cableLayoutMST: {
      totalCableLengthM: mst.totalWeight,
      edges: mst.mstEdges,
    },
    commsChannelAllocation: coloring,
    inspectionSurveyTour: surveyTour,
    telemetryCompression: telemetry,
  }
}
