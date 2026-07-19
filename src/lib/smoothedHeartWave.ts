// ─── Smoothed heart rhythm wave (HeartMath-style display) ──────────────────
//
// Pure, framework-agnostic resample + low-pass filter for DISPLAY only.
// Turns a stream of genuinely-measured beats into an evenly-spaced,
// time-axis BPM wave — the same technique emWave/Inner Balance use to show
// a smooth sinusoid instead of a jagged per-beat tachogram.
//
// This module is never imported by computeCoherence()/computeRmssdMs() in
// ZikirKhafiPlayer.tsx or AdminZikirKhafiDevPage.tsx, and every caller is
// expected to pass its OWN copy of beat data (a sibling ref, not the same
// array reference used for RMSSD) — see the call sites for the sibling refs
// this reads from.

export interface TimestampedBeat {
  tMs: number    // performance.now() at the moment this beat was measured
  rrMs: number   // real R-R interval (device R-R, or a genuine tap/beat diff)
}

export interface TimestampedBpm {
  tMs: number
  bpm: number    // raw instantaneous BPM reading (not RR-derived)
}

export interface SmoothedWavePoint {
  tSec: number       // seconds since the first sample in this batch
  bpm: number        // display BPM at this tick — smoothed, UNLESS unstable
  unstable: boolean  // true when the raw signal in this window is too sparse
                      // or too erratic to trust a smoothed value — bpm above
                      // is then the raw interpolated (unsmoothed) value, so
                      // an unstable stretch still reads as jagged rather than
                      // a falsely calm curve. Renderers should also apply a
                      // distinct (e.g. warning) color for these points.
}

export interface SmoothedWaveOptions {
  resampleMs?: number
  smoothingWindowSec?: number
  instabilityRatio?: number
  minBeatsForStability?: number
}

export const DEFAULT_RESAMPLE_MS = 500
export const DEFAULT_SMOOTH_WINDOW_SEC = 4
// Same divisor computeCoherence() uses (rmssd/mean/0.15) — reused here as the
// cutoff for a LOCAL, windowed version of the same ratio, so "unstable"
// means "this window alone would already score ~0 coherence on its own",
// not an arbitrary new number.
export const DEFAULT_INSTABILITY_RATIO = 0.15
export const DEFAULT_MIN_BEATS_FOR_STABILITY = 3

function localInstabilityRatio(beatsInWindow: { rrMs: number }[]): number | null {
  if (beatsInWindow.length < 2) return null
  const mean = beatsInWindow.reduce((s, b) => s + b.rrMs, 0) / beatsInWindow.length
  if (mean <= 0) return null
  let sq = 0
  for (let i = 1; i < beatsInWindow.length; i++) {
    const d = beatsInWindow[i].rrMs - beatsInWindow[i - 1].rrMs
    sq += d * d
  }
  const rmssd = Math.sqrt(sq / (beatsInWindow.length - 1))
  return rmssd / mean
}

// Resample a genuine beat stream onto a fixed time grid (linear
// interpolation between real beats) then apply a time-windowed moving
// average — the two-step HeartMath-style transform. Beats within a window
// that are too sparse or too erratic (per DEFAULT_INSTABILITY_RATIO) are
// left unsmoothed and flagged `unstable`, so motion artifact or a signal
// dropout never renders as a fabricated calm wave.
export function computeSmoothedWave(
  beats: TimestampedBeat[],
  opts: SmoothedWaveOptions = {}
): SmoothedWavePoint[] {
  const resampleMs = opts.resampleMs ?? DEFAULT_RESAMPLE_MS
  const windowSec = opts.smoothingWindowSec ?? DEFAULT_SMOOTH_WINDOW_SEC
  const instabilityRatio = opts.instabilityRatio ?? DEFAULT_INSTABILITY_RATIO
  const minBeats = opts.minBeatsForStability ?? DEFAULT_MIN_BEATS_FOR_STABILITY

  // Copy + sort — never mutates the caller's array, which may be the same
  // live ref another effect (e.g. a canvas rAF loop) is reading concurrently.
  const sorted = [...beats].sort((a, b) => a.tMs - b.tMs)
  if (sorted.length < 2) return []

  const t0 = sorted[0].tMs
  const points = sorted.map(b => ({ tMs: b.tMs - t0, bpm: 60000 / b.rrMs, rrMs: b.rrMs }))
  const lastT = points[points.length - 1].tMs
  const windowMs = windowSec * 1000

  // 1. Resample via linear interpolation between the two surrounding real
  //    beats at each fixed tick.
  const resampled: { tMs: number; bpm: number }[] = []
  let idx = 0
  for (let t = 0; t <= lastT; t += resampleMs) {
    while (idx < points.length - 2 && points[idx + 1].tMs < t) idx++
    const a = points[idx]
    const b = points[Math.min(idx + 1, points.length - 1)]
    const bpm = a.tMs === b.tMs
      ? a.bpm
      : a.bpm + (b.bpm - a.bpm) * ((t - a.tMs) / (b.tMs - a.tMs))
    resampled.push({ tMs: t, bpm })
  }

  // 2. Low-pass moving average over the resampled series, windowed by time
  //    (not point-count) so it stays physiologically meaningful regardless
  //    of resampleMs.
  const windowPoints = Math.max(1, Math.round(windowMs / resampleMs))

  return resampled.map((p, i) => {
    const start = Math.max(0, i - windowPoints + 1)
    const slice = resampled.slice(start, i + 1)
    const avgBpm = slice.reduce((s, x) => s + x.bpm, 0) / slice.length

    // Judge stability from the RAW beats actually falling within this same
    // time window — not the already-interpolated points, which would
    // always look smooth by construction.
    const windowStartMs = p.tMs - windowMs
    const rawInWindow = points.filter(pt => pt.tMs >= windowStartMs && pt.tMs <= p.tMs)
    const ratio = localInstabilityRatio(rawInWindow)
    const unstable = rawInWindow.length < minBeats || ratio === null || ratio > instabilityRatio

    return { tSec: p.tMs / 1000, bpm: unstable ? resampled[i].bpm : avgBpm, unstable }
  })
}

// Adapter for devices that never report real R-R (e.g. CYCPLUS BPM-only
// straps) — synthesizes a pseudo-interval purely so the same resample/
// smooth pipeline can run on raw BPM readings. Callers must NOT present the
// result as HRV-derived — label it as a BPM-only estimate.
export function bpmReadingsToBeats(readings: TimestampedBpm[]): TimestampedBeat[] {
  return readings.map(r => ({ tMs: r.tMs, rrMs: 60000 / r.bpm }))
}
