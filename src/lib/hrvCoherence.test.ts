import { describe, it, expect } from 'vitest'
import { computeCoherence, computeRmssdMs } from './hrvCoherence'

// Two-element interval array [1000, 1000+rmssd] has exactly one successive
// difference, so computeRmssdMs on it equals |rmssd| exactly (sqrt(d^2/1)) —
// the simplest exact way to feed computeCoherence a known RMSSD-ms value.
function intervalsFor(rmssdMs: number): number[] {
  return [1000, 1000 + rmssdMs]
}

describe('computeRmssdMs (unchanged — regression guard)', () => {
  it('returns 0 for fewer than 2 intervals', () => {
    expect(computeRmssdMs([])).toBe(0)
    expect(computeRmssdMs([850])).toBe(0)
  })

  it('matches the known RMSSD for a fixed interval set', () => {
    // diffs: 10, -15, 10 -> squares: 100, 225, 100 -> mean 141.666... -> sqrt
    const result = computeRmssdMs([800, 810, 795, 805])
    expect(result).toBeCloseTo(11.9024, 3)
  })

  it('returns exactly the injected RMSSD for a 2-element array', () => {
    expect(computeRmssdMs(intervalsFor(42))).toBeCloseTo(42, 6)
  })
})

describe('computeCoherence — ln(RMSSD)/6.5 (v2 formula)', () => {
  // Expected values from the RMSSD comparison table validated with the user
  // before implementation (5/15/30/50/80ms).
  const cases: [rmssd: number, expectedFraction: number][] = [
    [5, 0.2476],
    [15, 0.4166],
    [30, 0.5232],
    [50, 0.6019],
    [80, 0.6742],
  ]

  it.each(cases)('RMSSD=%ims -> coherence fraction ~%f', (rmssd, expected) => {
    expect(computeCoherence(intervalsFor(rmssd))).toBeCloseTo(expected, 3)
  })

  it('returns 0 when RMSSD is 0 (flat/identical intervals)', () => {
    expect(computeCoherence([1000, 1000, 1000])).toBe(0)
  })

  it('returns 0 for fewer than 2 intervals (delegates to computeRmssdMs)', () => {
    expect(computeCoherence([])).toBe(0)
    expect(computeCoherence([900])).toBe(0)
  })

  it('clamps to 1 (100%) for an implausibly large RMSSD', () => {
    // ln(2000)/6.5 ~= 1.169 , must clamp to 1
    expect(computeCoherence(intervalsFor(2000))).toBe(1)
  })

  it('never returns a value outside [0, 1] across a wide RMSSD sweep', () => {
    for (let rmssd = 1; rmssd <= 500; rmssd += 7) {
      const c = computeCoherence(intervalsFor(rmssd))
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    }
  })
})
