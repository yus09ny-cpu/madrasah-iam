// Shared x-axis (elapsed session time) tick logic for the hand-rolled SVG
// charts that plot a ZikirBadgeSeriesPoint[] against time — CoherenceBandChart
// and BpmOverTimeChart. Kept in one place so both charts always tick the same
// way on the same time axis when stacked together.

// "Nice" time interval so the x-axis shows roughly 4-6 ticks regardless of
// session length, rather than a fixed interval that's either too sparse on
// a 20-minute session or too crowded on a 1-minute one.
export function pickTickIntervalSec(maxT: number): number {
  const candidates = [15, 30, 60, 120, 300, 600, 900, 1800]
  return candidates.find(c => maxT / c <= 5) ?? 1800
}

// m:ss, unpadded minutes — matches this app's existing mmss convention
// (ZikirKhafiPlayer's own countdown, AdminZikirKhafiDevPage's formatTime),
// not the zero-padded "01:30" HeartMath's reference UI happened to use.
export function formatTimeTick(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Ticks from one interval up to maxT — skips t=0 (would crowd the y-axis
// labels on both charts) and never labels past the last real data point.
export function buildTimeTicks(maxT: number): number[] {
  const interval = pickTickIntervalSec(maxT)
  const ticks: number[] = []
  for (let t = interval; t <= maxT; t += interval) ticks.push(t)
  return ticks
}
