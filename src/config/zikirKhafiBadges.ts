// Satu-satunya tempat threshold combined BPM+Coherence badge (admin/research
// page sahaja, AdminZikirKhafiDevPage.tsx) ditakrifkan — semua nombor di bawah
// PLACEHOLDER, belum dikalibrasi terhadap sesi kajian sebenar (perlu device
// ECG-grade seperti HeartMath/Polar, bukan strap murah). Badge computation
// (getEarnedZikirBadges/getBestZikirBadge) sentiasa dipanggil di RENDER TIME
// terhadap raw metrics tersimpan (avg_bpm/coherence_score/series) — bukan
// disimpan sebagai boolean tetap dalam hrv_sessions — supaya sesi lama boleh
// dinilai semula secara automatik bila nombor di sini ditukar kelak.
//
// EVEN MORE STALE now (2026-07-23, ln(RMSSD) formula switch — see
// src/lib/hrvCoherence.ts): these coherenceFloor numbers were never
// calibrated against EITHER formula, but they're especially unreachable
// against the new one. coherenceFloor:88 ('zon_emas') needs an RMSSD in the
// hundreds of ms under ln(RMSSD)/6.5 — essentially never happens at rest —
// so that badge is likely now unearnable in practice. Left unchanged
// pending a product decision on new thresholds rather than guessing.

export interface ZikirBadgeSeriesPoint {
  t: number                 // saat berlalu sejak sesi mula
  bpm: number
  coherence: number | null  // null = tiada R-R sebenar pada ketika itu (fallback/dropout)
}

export interface ZikirBadgeThreshold {
  id: string
  label: string
  bpmCeiling: number       // avgBpm mesti <= ini
  coherenceFloor: number   // coherenceScore (0-100) mesti >= ini
  requireBoth: boolean     // false = OR (badge 1 sahaja); true = AND (badge 2-4)
  sustainPct?: number      // badge 4 sahaja — % durasi sampel dengan data coherence
                           // sebenar di mana KEDUA-DUA syarat berlaku serentak
}

// Tersusun mudah → sukar. requireBoth:false HANYA untuk badge pertama.
export const ZIKIR_KHAFI_BADGES: ZikirBadgeThreshold[] = [
  { id: 'permulaan_baik', label: 'Permulaan Baik', bpmCeiling: 70, coherenceFloor: 50, requireBoth: false },
  { id: 'selaras', label: 'Selaras', bpmCeiling: 60, coherenceFloor: 65, requireBoth: true },
  { id: 'resonans_mendalam', label: 'Resonans Mendalam', bpmCeiling: 55, coherenceFloor: 80, requireBoth: true },
  { id: 'zon_emas', label: 'Zon Emas', bpmCeiling: 50, coherenceFloor: 88, requireBoth: true, sustainPct: 50 },
]

export interface ZikirBadgeSessionInput {
  avgBpm: number
  coherenceScore: number
  series: ZikirBadgeSeriesPoint[] | null
}

function computeSustainPct(series: ZikirBadgeSeriesPoint[], bpmCeiling: number, coherenceFloor: number): number | null {
  const withCoherence = series.filter(p => p.coherence !== null)
  if (withCoherence.length === 0) return null
  const met = withCoherence.filter(p => p.bpm <= bpmCeiling && (p.coherence as number) >= coherenceFloor)
  return Math.round((met.length / withCoherence.length) * 100)
}

export function isZikirBadgeEarned(threshold: ZikirBadgeThreshold, session: ZikirBadgeSessionInput): boolean {
  const bpmOk = session.avgBpm <= threshold.bpmCeiling
  const coherenceOk = session.coherenceScore >= threshold.coherenceFloor
  const baseMet = threshold.requireBoth ? bpmOk && coherenceOk : bpmOk || coherenceOk
  if (!baseMet) return false
  if (threshold.sustainPct === undefined) return true
  // Sustain badges need the timestamped series — a session saved before this
  // feature existed (or one with no real coherence samples at all) simply
  // can't earn it, rather than guessing from the aggregate alone.
  if (!session.series || session.series.length === 0) return false
  const pct = computeSustainPct(session.series, threshold.bpmCeiling, threshold.coherenceFloor)
  return pct !== null && pct >= threshold.sustainPct
}

export function getEarnedZikirBadges(session: ZikirBadgeSessionInput): ZikirBadgeThreshold[] {
  return ZIKIR_KHAFI_BADGES.filter(b => isZikirBadgeEarned(b, session))
}

// Hardest badge actually earned (array is ordered easiest → hardest already).
export function getBestZikirBadge(session: ZikirBadgeSessionInput): ZikirBadgeThreshold | null {
  const earned = getEarnedZikirBadges(session)
  return earned.length > 0 ? earned[earned.length - 1] : null
}
