/**
 * Feature 3: Space Weather Analog Search & Knowledge Retrieval Engine.
 * 1. Cosine similarity analog search over historical storm embeddings.
 * 2. Keyword exact search over docs/kb.json entries.
 * Rule 1: Never invent text. Only return text that exists in the files.
 */

export interface EventIndexEntry {
  id: string
  name: string
  date: string
  description: string
  embedding: number[] // 64-dimensional vector
  metrics: Record<string, number | string>
}

export interface KBEntry {
  id: string
  title: string
  summary: string
  source: string
  needs_verification?: boolean
}

/**
 * Computes cosine similarity between two float vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom <= 0) return 0
  return dot / denom
}

/**
 * Finds top-k most similar past storm events via cosine similarity.
 */
export function searchTopAnalogEvents(
  queryEmbedding: number[],
  eventCatalog: EventIndexEntry[],
  topK: number = 3,
): { event: EventIndexEntry; similarity: number }[] {
  const scored = eventCatalog.map((event) => ({
    event,
    similarity: cosineSimilarity(queryEmbedding, event.embedding),
  }))

  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, topK)
}

/**
 * Keyword search across knowledge base items.
 * Performs case-insensitive matching across title and summary.
 */
export function searchKnowledgeBase(query: string, kbEntries: KBEntry[]): KBEntry[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1)

  if (tokens.length === 0) return []

  return kbEntries.filter((entry) => {
    const text = (entry.title + ' ' + entry.summary).toLowerCase()
    return tokens.every((token) => text.includes(token))
  })
}
