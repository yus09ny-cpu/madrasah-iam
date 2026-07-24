// ---------------------------------------------------------------------------
// computeRmssdMs — raw RMSSD in ms (not normalized), for saved experiment rows
// ---------------------------------------------------------------------------
export function computeRmssdMs(intervalsMs: number[]): number {
  if (intervalsMs.length < 2) return 0
  let sq = 0
  for (let i = 1; i < intervalsMs.length; i++) {
    const d = intervalsMs[i] - intervalsMs[i - 1]
    sq += d * d
  }
  return Math.sqrt(sq / (intervalsMs.length - 1))
}

// ---------------------------------------------------------------------------
// computeCoherence — ln(RMSSD)-derived HRV score, 0 (low) → 1 (high)
//
// v2 formula (replaces the old RMSSD/meanRR/0.15 ratio, which had no
// scientific citation anywhere in this codebase or its history).
//
// The natural-log transform of RMSSD is standard practice in the HRV
// literature because RMSSD is not normally distributed across a population
// (roughly log-normal) — see Esco & Flatt (2014), "Ultra-Short-Term Heart
// Rate Variability Indexes at Rest and Post-Exercise in Athletes," which
// validates a 60-second lnRMSSD window as a reliable surrogate for the
// standard 5-minute RMSSD measurement; also Plews, Laursen, Kilding &
// Buchheit (2013), "Training Adaptation and Heart Rate Variability in Elite
// Endurance Athletes," which log-transforms rMSSD specifically to reduce
// bias from non-uniform error when tracking training adaptation.
//
// The specific "/6.5" scaling constant is NOT itself from a peer-reviewed
// source — it is Elite HRV's own disclosed, empirically-calibrated scale
// (derived from >6,000,000 readings in their consumer database, per their
// public Knowledge Base) mapping a typical human ln(RMSSD) range of ~0–6.5
// onto a 0–100 score. It is more transparent than the constant it replaces,
// but it is a product calibration, not a universal scientific derivation —
// be upfront about that distinction if this number is discussed academically.
//
// Callers must only pass genuinely measured intervals (device R-R or real
// tap timestamps) — a BPM-derived pseudo-interval has near-zero variance and
// will falsely collapse RMSSD toward 0.
//
// Known caveat NOT addressed by this formula change: some call sites feed
// this a short rolling window (~7 beats) for live/real-time display, far
// shorter than the 60-second window the cited validation used. See the
// window-size comments at each call site.
// ---------------------------------------------------------------------------
export function computeCoherence(intervalsMs: number[]): number {
  const rmssd = computeRmssdMs(intervalsMs)
  if (rmssd <= 0) return 0
  return Math.max(0, Math.min(1, Math.log(rmssd) / 6.5))
}

// ---------------------------------------------------------------------------
// COHERENCE_FORMULA_V2_CUTOFF — the exact production cutover moment for the
// v1 -> v2 (ln-RMSSD) formula switch above: commit 2161198 ("Merge
// feat/hrv-score-ln-rmssd: ln(RMSSD) HRV formula update") into main.
//
// Any saved row/point with a timestamp before this was computed under the
// old RMSSD/meanRR/0.15 ratio formula. Neither zikir_khafi_sessions.coherence
// nor hrv_sessions.series' per-point coherence stored the raw R-R behind the
// number, so pre-cutoff values CANNOT be recalculated to v2 after the fact —
// they must stay flagged as legacy rather than silently mixed with v2 values
// in the same chart/threshold. (hrv_sessions.coherence_score is the one
// exception: it has a separate raw `rmssd` column, which is what makes its
// coherence_score_v2 backfill column possible — see
// hrv_sessions_coherence_v2.sql.)
//
// Single source of truth — every call site needing this distinction (e.g.
// src/components/zikir/KhafiHistoryPanel.tsx, HrvSessionsReview.tsx) should
// import this constant rather than redeclaring its own copy of the timestamp.
export const COHERENCE_FORMULA_V2_CUTOFF = new Date('2026-07-23T22:32:15+08:00')
