import { memo } from 'react'
import type { ZikirBadgeSeriesPoint } from '@/config/zikirKhafiBadges'
import { buildTimeTicks, formatTimeTick } from '@/lib/chartAxisTicks'

// Plain BPM-over-time line — the companion to CoherenceBandChart (same
// series prop, same x-axis tick logic via chartAxisTicks.ts, same 280x150
// SVG geometry) but deliberately simpler: no bands, no fixed scale. BPM
// range varies per person/session, so unlike coherence's fixed 0-100 axis,
// this one auto-scales to the session's own min/max.
//
// Purple (#a78bfa) — the app's existing Zikir Khafi brand accent (orb glow,
// BLE badge) throughout, and visually distinct from the coherence chart's
// white trend line plus its orange/blue/green bands when the two are
// stacked together.
interface Props {
  series: ZikirBadgeSeriesPoint[]
  className?: string
}

function BpmOverTimeChart({ series, className }: Props) {
  if (series.length < 2) return null

  const width = 280
  const height = 150
  const plotLeft = 26
  const plotRight = 6
  const plotTop = 8
  const plotBottom = 18
  const plotW = width - plotLeft - plotRight
  const plotH = height - plotTop - plotBottom

  const bpms = series.map(p => p.bpm)
  const minBpm = Math.floor(Math.min(...bpms))
  const maxBpm = Math.ceil(Math.max(...bpms))
  const bpmRange = Math.max(1, maxBpm - minBpm)

  const maxT = Math.max(1, series[series.length - 1].t)
  const x = (t: number) => plotLeft + (t / maxT) * plotW
  const y = (bpm: number) => plotTop + (1 - (bpm - minBpm) / bpmRange) * plotH

  const xTicks = buildTimeTicks(maxT)

  return (
    <div className={className ? `flex flex-col items-center gap-1.5 ${className}` : 'flex flex-col items-center gap-1.5'}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs">
        <polyline
          points={series.map(pt => `${x(pt.t)},${y(pt.bpm)}`).join(' ')}
          fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Y-axis — session's own min/max, not a fixed scale (unlike coherence's 0-100) */}
        <text x={plotLeft - 4} y={y(maxBpm)} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#9ca3af">
          {maxBpm}
        </text>
        <text x={plotLeft - 4} y={y(minBpm)} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#9ca3af">
          {minBpm}
        </text>
        {/* X-axis — same tick logic/cadence as CoherenceBandChart's, so a stacked pair always agree */}
        {xTicks.map(t => (
          <text key={t} x={x(t)} y={height - 5} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {formatTimeTick(t)}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-gray-400">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#a78bfa' }} />
        BPM
      </div>
    </div>
  )
}

export default memo(BpmOverTimeChart)
