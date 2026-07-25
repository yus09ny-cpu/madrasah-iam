import { memo } from 'react'
import { COHERENCE_BANDS } from '@/config/coherenceBands'
import type { ZikirBadgeSeriesPoint } from '@/config/zikirKhafiBadges'
import { buildTimeTicks, formatTimeTick } from '@/lib/chartAxisTicks'
import { computeAvgCoherence } from '@/lib/zikirKhafiSummary'

// HeartMath-style tiered coherence chart — 3 stacked color bands (see
// src/config/coherenceBands.ts) with a white trend line plotted through the
// session's own coherence series. Deliberately plain inline SVG (no chart
// library), matching this file's existing hand-rolled chart convention
// (BpmHistoryGraph/SmoothedWaveChart in ZikirKhafiPlayer.tsx) so it drops
// into either call site — ZikirKhafiPlayer.tsx's summary screen or
// HrvSessionsReview.tsx's per-session detail — without pulling recharts
// into a bundle that doesn't already depend on it.
//
// Caller's responsibility: only pass a series whose points were computed
// under the current (v2, ln-RMSSD) formula — see COHERENCE_FORMULA_V2_CUTOFF
// in src/lib/hrvCoherence.ts. This component has no way to tell v1 from v2
// points itself (they're both just numbers 0-100 by the time they get here).
//
// memo()'d because both ZikirKhafiPlayer.tsx and AdminZikirKhafiDevPage.tsx
// now render this live, mid-session, inside trees that already re-render
// every 250ms (countdown tick) and per beat (orb pulse) — without memo this
// would redo the filter/map over the whole series on every one of those,
// not just the ~2.5s cadence the series array actually grows on.
interface Props {
  series: ZikirBadgeSeriesPoint[]
  className?: string
}

// Y-axis ticks are the band boundaries themselves (0/40/65/100 today), not
// generic 0/50/100 — the label then sits exactly where the color changes,
// so the number stays tied to the color meaning instead of being a second,
// disconnected scale. Pulled from COHERENCE_BANDS at render time, so
// recalibrating that config moves these labels automatically (same
// self-updating promise as the bands themselves — see that file's header).
function yAxisTicks(): number[] {
  const values = new Set<number>([0, 100])
  COHERENCE_BANDS.forEach(band => { values.add(band.min); values.add(band.max) })
  return [...values].sort((a, b) => a - b)
}

function CoherenceBandChart({ series, className }: Props) {
  const withCoherence = series.filter(p => p.coherence !== null)
  if (withCoherence.length < 2) return null

  const width = 280
  const height = 150
  // Separate margins (not a single padX/padY) — the plot area needs real
  // room on the left for "100%" and on the bottom for time labels, without
  // shrinking the bands themselves.
  const plotLeft = 26
  const plotRight = 6
  const plotTop = 8
  const plotBottom = 18
  const plotW = width - plotLeft - plotRight
  const plotH = height - plotTop - plotBottom

  const maxT = Math.max(1, series[series.length - 1].t)
  const x = (t: number) => plotLeft + (t / maxT) * plotW
  // Fixed 0-100 scale (not data min/max) — the whole point is to show where
  // the line sits relative to the fixed bands, not to rescale bands to data.
  const y = (v: number) => plotTop + (1 - v / 100) * plotH

  // withCoherence.length >= 2 is already guaranteed by the early return
  // above, so this is never actually null — computeAvgCoherence is the
  // single source of truth shared with computeAchievementScore, though.
  const avg = computeAvgCoherence(series) ?? 0

  const yTicks = yAxisTicks()
  const xTicks = buildTimeTicks(maxT)

  return (
    <div className={className ? `flex flex-col items-center gap-1.5 ${className}` : 'flex flex-col items-center gap-1.5'}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs">
        {COHERENCE_BANDS.map(band => (
          <rect
            key={band.id}
            x={plotLeft}
            y={y(band.max)}
            width={plotW}
            height={Math.max(0, y(band.min) - y(band.max))}
            fill={band.color}
            fillOpacity={0.16}
          />
        ))}
        {series.slice(1).map((pt, i) => {
          const prev = series[i]
          if (pt.coherence === null || prev.coherence === null) return null
          return (
            <line
              key={pt.t}
              x1={x(prev.t)} y1={y(prev.coherence)}
              x2={x(pt.t)} y2={y(pt.coherence)}
              stroke="#ffffff" strokeWidth={2} strokeLinecap="round"
            />
          )
        })}
        {/* Y-axis — band boundary values, right-aligned against the plot's left edge */}
        {yTicks.map(v => (
          <text key={v} x={plotLeft - 4} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#9ca3af">
            {v}%
          </text>
        ))}
        {/* X-axis — elapsed session time, skips t=0 (would crowd the y-axis labels) */}
        {xTicks.map(t => (
          <text key={t} x={x(t)} y={height - 5} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {formatTimeTick(t)}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-3 flex-wrap justify-center text-[9px] uppercase tracking-wider text-gray-400">
        {COHERENCE_BANDS.map(band => (
          <span key={band.id} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: band.color }} />
            {band.label}
          </span>
        ))}
        <span className="text-gray-300 normal-case tracking-normal">Purata {avg}%</span>
      </div>
    </div>
  )
}

export default memo(CoherenceBandChart)
