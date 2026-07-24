// Tiered coherence color bands — HeartMath-style visual presentation (3
// stacked color zones + a trend line through them), applied to OUR OWN
// corrected HRV Score (ln(RMSSD)/6.5, see src/lib/hrvCoherence.ts) — this is
// NOT an attempt to reproduce HeartMath's proprietary power-spectral-density
// coherence algorithm, only the visual convention of presenting a 0-100
// score against fixed reference zones.
//
// Thresholds are PLACEHOLDER, uncalibrated against real v2-formula session
// data (same caveat as src/config/zikirKhafiBadges.ts's coherenceFloor
// values, which are already known to be miscalibrated for the same reason —
// see that file's header comment). Kept in one place, read at render time
// (never baked into a saved row), so recalibrating later re-renders every
// past session automatically.

export interface CoherenceBand {
  id: 'low' | 'mid' | 'high'
  label: string
  min: number   // inclusive, 0-100 scale
  max: number   // exclusive for low/mid, inclusive (100) for high
  color: string
}

export const COHERENCE_BANDS: CoherenceBand[] = [
  { id: 'low', label: 'Rendah', min: 0, max: 40, color: '#f97316' },
  { id: 'mid', label: 'Sederhana', min: 40, max: 65, color: '#3b82f6' },
  { id: 'high', label: 'Tinggi', min: 65, max: 100, color: '#22c55e' },
]
