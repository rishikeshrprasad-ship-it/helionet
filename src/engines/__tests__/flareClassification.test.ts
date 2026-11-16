import { describe, it, expect } from 'vitest'
import { getFlareClass } from '../flareClassification'

describe('Flare Classification Engine (NOAA X-ray & R-Scale)', () => {
  it('returns null for NaN, zero, and negative values', () => {
    expect(getFlareClass(NaN)).toBeNull()
    expect(getFlareClass(0)).toBeNull()
    expect(getFlareClass(-1e-5)).toBeNull()
    expect(getFlareClass(Infinity)).toBeNull()
  })

  it('classifies sub-1e-8 flux as Class A with subNumber < 1.0', () => {
    const res = getFlareClass(5e-9)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('A')
    expect(res?.subNumber).toBe(0.5)
    expect(res?.label).toBe('A0.5')
    expect(res?.rScale).toBe('R0')
  })

  it('classifies 1e-8 as A1.0, R0', () => {
    const res = getFlareClass(1e-8)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('A')
    expect(res?.subNumber).toBe(1.0)
    expect(res?.label).toBe('A1.0')
    expect(res?.rScale).toBe('R0')
  })

  it('classifies 9.99e-8 as A-class, R0', () => {
    const res = getFlareClass(9.99e-8)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('A')
    expect(res?.subNumber).toBe(10.0)
    expect(res?.label).toBe('A10.0')
    expect(res?.rScale).toBe('R0')
  })

  it('classifies 1e-7 as B1.0, R0', () => {
    const res = getFlareClass(1e-7)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('B')
    expect(res?.subNumber).toBe(1.0)
    expect(res?.label).toBe('B1.0')
    expect(res?.rScale).toBe('R0')
  })

  it('classifies 9.5e-5 as M9.5, R2', () => {
    const res = getFlareClass(9.5e-5)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('M')
    expect(res?.subNumber).toBe(9.5)
    expect(res?.label).toBe('M9.5')
    expect(res?.rScale).toBe('R2')
  })

  it('classifies 1e-4 as X1.0, R3', () => {
    const res = getFlareClass(1e-4)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('X')
    expect(res?.subNumber).toBe(1.0)
    expect(res?.label).toBe('X1.0')
    expect(res?.rScale).toBe('R3')
  })

  it('classifies 1.4e-4 as X1.4, R3', () => {
    const res = getFlareClass(1.4e-4)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('X')
    expect(res?.subNumber).toBe(1.4)
    expect(res?.label).toBe('X1.4')
    expect(res?.rScale).toBe('R3')
  })

  it('classifies 2.8e-3 as X28.0, R5', () => {
    const res = getFlareClass(2.8e-3)
    expect(res).not.toBeNull()
    expect(res?.classLetter).toBe('X')
    expect(res?.subNumber).toBe(28.0)
    expect(res?.label).toBe('X28.0')
    expect(res?.rScale).toBe('R5')
  })
})
