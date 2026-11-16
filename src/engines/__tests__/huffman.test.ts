import { describe, it, expect } from 'vitest'
import {
  buildHuffmanCoding,
  isPrefixFree,
  encodeHuffman,
  type SymbolFrequency,
} from '../huffman'

describe('Huffman Telemetry Coding Engine (Feature 20)', () => {
  const telemetryFrequencies: SymbolFrequency[] = [
    { symbol: 'STATUS_OK', frequency: 65 },
    { symbol: 'ATTITUDE_SYNC', frequency: 15 },
    { symbol: 'BATTERY_LOW', frequency: 10 },
    { symbol: 'SOLAR_FLUX_SPIKE', frequency: 6 },
    { symbol: 'RADIO_LOSS', frequency: 3 },
    { symbol: 'SEU_REBOOT', frequency: 1 },
  ]

  it('TEST REQUIREMENT: generated code table is strictly prefix-free', () => {
    const res = buildHuffmanCoding(telemetryFrequencies)
    expect(isPrefixFree(res.codeTable)).toBe(true)
  })

  it('assigns shorter codewords to higher frequency symbols', () => {
    const res = buildHuffmanCoding(telemetryFrequencies)
    const lenStatusOk = res.codeTable['STATUS_OK'].length
    const lenSeuReboot = res.codeTable['SEU_REBOOT'].length
    expect(lenStatusOk).toBeLessThan(lenSeuReboot)
  })

  it('computes compression ratio greater than 1 vs fixed-length binary', () => {
    const res = buildHuffmanCoding(telemetryFrequencies)
    // 6 symbols require 3 bits in fixed-length binary
    expect(res.fixedLengthBits).toBe(3)
    // Average Huffman length should be significantly less than 3 bits
    expect(res.averageLength).toBeLessThan(2.0)
    expect(res.compressionRatio).toBeGreaterThan(1.5)
  })

  it('correctly encodes a telemetry stream', () => {
    const res = buildHuffmanCoding(telemetryFrequencies)
    const stream = ['STATUS_OK', 'SOLAR_FLUX_SPIKE', 'STATUS_OK']
    const encoded = encodeHuffman(stream, res.codeTable)

    const expected =
      res.codeTable['STATUS_OK'] +
      res.codeTable['SOLAR_FLUX_SPIKE'] +
      res.codeTable['STATUS_OK']
    expect(encoded).toBe(expected)
  })
})
