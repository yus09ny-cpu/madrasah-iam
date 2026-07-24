import { COHERENCE_BANDS } from '@/config/coherenceBands'
import type { ZikirBadgeSeriesPoint } from '@/config/zikirKhafiBadges'

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

interface Props {
  series: ZikirBadgeSeriesPoint[]
  className?: string
}

export default function CoherenceBandChart({ series, className }: Props) {
  const withCoherence = series.filter(p => p.coherence !== null)
  if (withCoherence.length < 2) return null

  const width = 280
  const height = 130
  const padX = 6
  const padY = 8
  const maxT = Math.max(1, series[series.length - 1].t)
  const x = (t: number) => padX + (t / maxT) * (width - padX * 2)
  // Fixed 0-100 scale (not data min/max) — the whole point is to show where
  // the line sits relative to the fixed bands, not to rescale bands to data.
  const y = (v: number) => padY + (1 - v / 100) * (height - padY * 2)

  const avg = Math.round(withCoherence.reduce((a, p) => a + (p.coherence as number), 0) / withCoherence.length)

  return (
    <div className={className ? `flex flex-col items-center gap-1.5 ${className}` : 'flex flex-col items-center gap-1.5'}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs">
        {COHERENCE_BANDS.map(band => (
          <rect
            key={band.id}
            x={padX}
            y={y(band.max)}
            width={width - padX * 2}
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
