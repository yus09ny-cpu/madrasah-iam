// Post-session Results-screen derived stats — time-in-zone breakdown,
// evaluative phrase, achievement score. All computed at render time from
// data already in memory/stored (a ZikirBadgeSeriesPoint[] series, plus the
// avgBpm/coherenceScore aggregates that already exist) — same convention as
// getEarnedZikirBadges (see zikirKhafiBadges.ts header): nothing here gets
// baked into a saved row, so recalibrating COHERENCE_BANDS or
// ZIKIR_KHAFI_BADGES later re-renders every past session automatically.

import { COHERENCE_BANDS } from '@/config/coherenceBands'
import { getBestZikirBadge, type ZikirBadgeSeriesPoint, type ZikirBadgeSessionInput } from '@/config/zikirKhafiBadges'

export interface ZoneBreakdown {
  low: number
  mid: number
  high: number
}

// Single source of truth for "average coherence" — used by CoherenceBandChart's
// own "Purata" legend AND by computeAchievementScore below, so the chart and
// the score never disagree with each other about what the average was.
export function computeAvgCoherence(series: ZikirBadgeSeriesPoint[]): number | null {
  const withCoherence = series.filter(p => p.coherence !== null)
  if (withCoherence.length === 0) return null
  return Math.round(withCoherence.reduce((a, p) => a + (p.coherence as number), 0) / withCoherence.length)
}

// Largest-remainder rounding — three independently-rounded percentages can
// land on e.g. 33+33+33=99; this guarantees they always sum to exactly 100.
function distributeRemainder(raw: Record<'low' | 'mid' | 'high', number>): ZoneBreakdown {
  const ids = ['low', 'mid', 'high'] as const
  const floors = ids.map(id => Math.floor(raw[id]))
  const remainder = 100 - floors.reduce((a, b) => a + b, 0)
  const order = ids
    .map((id, i) => ({ id, i, frac: raw[id] - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  const result: ZoneBreakdown = { low: floors[0], mid: floors[1], high: floors[2] }
  for (let k = 0; k < remainder; k++) result[order[k].id] += 1
  return result
}

// % of non-null-coherence samples falling in each COHERENCE_BANDS band —
// same "exclude null from the denominator" convention as
// zikirKhafiBadges.ts's computeSustainPct (a dropout/fallback sample was
// never actually measuring anything, so it shouldn't dilute the percentages
// of the samples that were).
export function computeZoneBreakdown(series: ZikirBadgeSeriesPoint[]): ZoneBreakdown | null {
  const withCoherence = series.filter(p => p.coherence !== null)
  if (withCoherence.length === 0) return null
  const counts = { low: 0, mid: 0, high: 0 }
  for (const p of withCoherence) {
    const band = COHERENCE_BANDS.find(b => p.coherence! >= b.min && p.coherence! < b.max) ?? COHERENCE_BANDS[COHERENCE_BANDS.length - 1]
    counts[band.id]++
  }
  const total = withCoherence.length
  return distributeRemainder({
    low: (counts.low / total) * 100,
    mid: (counts.mid / total) * 100,
    high: (counts.high / total) * 100,
  })
}

// Weighted toward genuine encouragement at the low end deliberately — see
// ZIKIR_KHAFI_BADGES's own header comment: 'zon_emas' is likely unearnable
// in practice post-ln(RMSSD) switch, and 'resonans_mendalam' is steep too,
// so 'none'/'permulaan_baik' will be the common case for a long while, not
// the edge case. Approved wording (2026-07-25) — don't reword without
// checking with product first, this was a deliberate tone decision.
const EVALUATIVE_PHRASES: Record<'none' | 'permulaan_baik' | 'selaras' | 'resonans_mendalam' | 'zon_emas', string> = {
  none: 'Teruskan Usaha',
  permulaan_baik: 'Permulaan Baik!',
  selaras: 'Hati Mula Selaras!',
  resonans_mendalam: 'Resonans Mendalam!',
  zon_emas: 'Cemerlang!',
}

export function getEvaluativeLabel(session: ZikirBadgeSessionInput): string {
  const best = getBestZikirBadge(session)
  return EVALUATIVE_PHRASES[(best?.id as keyof typeof EVALUATIVE_PHRASES) ?? 'none']
}

// "Coherence-minutes" — average coherence x minutes practiced is a real
// accumulated quantity (area under the coherence curve), not an arbitrary
// index, so duration and consistency both matter and neither alone can
// game it. The high-zone term is a multiplicative bonus (max +50% at 100%
// high-zone time) on top of that base, not a separate additive score —
// a short high-intensity burst still can't outscore sustained practice
// (1min @ 100% high-zone = 100x1x1.5 = 150; 20min @ 50% avg with zero
// high-zone time = 50x20x1 = 1000). Deliberately NOT normalized/capped —
// grows with practice time by design (approved 2026-07-25).
export function computeAchievementScore(avgCoherencePct: number, durationMinutes: number, highZonePct: number): number {
  return Math.round(avgCoherencePct * durationMinutes * (1 + highZonePct / 200))
}
