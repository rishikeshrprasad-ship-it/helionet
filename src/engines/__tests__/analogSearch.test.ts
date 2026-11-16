import { describe, it, expect } from 'vitest'
import {
  cosineSimilarity,
  searchTopAnalogEvents,
  searchKnowledgeBase,
  type EventIndexEntry,
  type KBEntry,
} from '../analogSearch'

describe('Analog Search & Knowledge Base Engine (Feature 3)', () => {
  it('computes exact cosine similarity between vector embeddings', () => {
    const v1 = [1, 0, 0]
    const v2 = [1, 0, 0]
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 10)

    const vOrthogonal = [0, 1, 0]
    expect(cosineSimilarity(v1, vOrthogonal)).toBeCloseTo(0.0, 10)

    const vOpposite = [-1, 0, 0]
    expect(cosineSimilarity(v1, vOpposite)).toBeCloseTo(-1.0, 10)
  })

  it('ranks analog events by cosine similarity and returns top 3', () => {
    const catalog: EventIndexEntry[] = [
      {
        id: 'evt-1',
        name: 'Storm A',
        date: '2003-10-28',
        description: 'Halloween storm',
        embedding: [0.9, 0.4, 0.1],
        metrics: { kp: 9 },
      },
      {
        id: 'evt-2',
        name: 'Storm B',
        date: '2022-02-03',
        description: 'Starlink loss event',
        embedding: [0.3, 0.9, 0.3],
        metrics: { kp: 5 },
      },
      {
        id: 'evt-3',
        name: 'Storm C',
        date: '2024-05-10',
        description: 'Gannon G5 storm',
        embedding: [0.85, 0.5, 0.15],
        metrics: { kp: 9 },
      },
      {
        id: 'evt-4',
        name: 'Quiet Period',
        date: '2020-01-01',
        description: 'Solar minimum baseline',
        embedding: [-0.8, -0.6, 0.0],
        metrics: { kp: 1 },
      },
    ]

    const query = [0.9, 0.45, 0.1] // Close to Storm A and Storm C
    const top3 = searchTopAnalogEvents(query, catalog, 3)

    expect(top3.length).toBe(3)
    // Most similar should be Storm A, then Storm C
    expect(top3[0].event.id).toBe('evt-1')
    expect(top3[1].event.id).toBe('evt-3')
    expect(top3[0].similarity).toBeGreaterThan(top3[1].similarity)
  })

  it('searches knowledge base strictly without hallucinating or inventing text', () => {
    const kb: KBEntry[] = [
      {
        id: 'noaa-r1',
        title: 'NOAA Radio Blackout R1',
        summary: 'X-ray flux >= 1e-5 W/m2 corresponding to M1 class flare.',
        source: 'https://swpc.noaa.gov',
      },
      {
        id: 'noaa-s1',
        title: 'NOAA Radiation Storm S1',
        summary: 'Proton flux >= 10 pfu at >= 10 MeV measured by GOES.',
        source: 'https://swpc.noaa.gov',
      },
    ]

    const matches = searchKnowledgeBase('proton flux', kb)
    expect(matches.length).toBe(1)
    expect(matches[0].id).toBe('noaa-s1')
    expect(matches[0].summary).toContain('10 pfu')

    // Query for non-existent concept
    const noMatches = searchKnowledgeBase('supernova warp drive', kb)
    expect(noMatches.length).toBe(0)
  })
})
