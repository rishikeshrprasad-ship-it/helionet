/**
 * Feature 20: Huffman Coding for Constellation & Rover Telemetry.
 * Outputs: code table, average length, compression ratio.
 * Test constraint: prefix-free code verification.
 */

export interface SymbolFrequency {
  symbol: string
  frequency: number
}

interface HuffmanNode {
  symbol?: string
  weight: number
  left?: HuffmanNode
  right?: HuffmanNode
}

export interface HuffmanResult {
  codeTable: Record<string, string>
  averageLength: number
  entropy: number
  fixedLengthBits: number
  compressionRatio: number
}

/**
 * Builds canonical Huffman coding tree and derives prefix-free codebook.
 */
export function buildHuffmanCoding(frequencies: SymbolFrequency[]): HuffmanResult {
  if (frequencies.length === 0) {
    return {
      codeTable: {},
      averageLength: 0,
      entropy: 0,
      fixedLengthBits: 0,
      compressionRatio: 1.0,
    }
  }

  if (frequencies.length === 1) {
    const sym = frequencies[0].symbol
    return {
      codeTable: { [sym]: '0' },
      averageLength: 1.0,
      entropy: 0,
      fixedLengthBits: 1,
      compressionRatio: 1.0,
    }
  }

  const totalFreq = frequencies.reduce((sum, item) => sum + item.frequency, 0)
  if (totalFreq <= 0) {
    throw new Error('Total frequency must be positive')
  }

  // Initialize priority queue / sorted array of leaf nodes
  let nodes: HuffmanNode[] = frequencies.map((item) => ({
    symbol: item.symbol,
    weight: item.frequency / totalFreq,
  }))

  while (nodes.length > 1) {
    // Sort ascending by weight
    nodes.sort((a, b) => a.weight - b.weight)

    const left = nodes[0]
    const right = nodes[1]
    const parent: HuffmanNode = {
      weight: left.weight + right.weight,
      left,
      right,
    }

    nodes = [parent, ...nodes.slice(2)]
  }

  const root = nodes[0]
  const codeTable: Record<string, string> = {}

  function traverse(node: HuffmanNode, currentCode: string) {
    if (node.symbol !== undefined) {
      codeTable[node.symbol] = currentCode.length > 0 ? currentCode : '0'
      return
    }
    if (node.left) traverse(node.left, currentCode + '0')
    if (node.right) traverse(node.right, currentCode + '1')
  }

  traverse(root, '')

  // Calculate metrics: average code length and theoretical Shannon entropy
  let averageLength = 0
  let entropy = 0
  for (const item of frequencies) {
    const p = item.frequency / totalFreq
    const code = codeTable[item.symbol] || ''
    averageLength += p * code.length
    if (p > 0) {
      entropy -= p * Math.log2(p)
    }
  }

  const numSymbols = frequencies.length
  const fixedLengthBits = Math.max(1, Math.ceil(Math.log2(numSymbols)))
  const compressionRatio = fixedLengthBits / Math.max(1e-6, averageLength)

  return {
    codeTable,
    averageLength,
    entropy,
    fixedLengthBits,
    compressionRatio,
  }
}

/**
 * Verifies that a code table satisfies the prefix-free property:
 * No codeword is a prefix of any other codeword.
 */
export function isPrefixFree(codeTable: Record<string, string>): boolean {
  const codes = Object.values(codeTable)
  for (let i = 0; i < codes.length; i++) {
    for (let j = 0; j < codes.length; j++) {
      if (i !== j) {
        if (codes[j].startsWith(codes[i])) {
          return false
        }
      }
    }
  }
  return true
}

/**
 * Encodes a string of symbols into a bitstring using the code table.
 */
export function encodeHuffman(symbols: string[], codeTable: Record<string, string>): string {
  return symbols.map((s) => codeTable[s] ?? '').join('')
}
