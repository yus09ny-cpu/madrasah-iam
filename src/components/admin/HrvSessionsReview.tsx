import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { ZIKIR_KHAFI_BADGES, getEarnedZikirBadges, isZikirBadgeEarned, type ZikirBadgeSeriesPoint } from '@/config/zikirKhafiBadges'
import { COHERENCE_BANDS } from '@/config/coherenceBands'
import { COHERENCE_FORMULA_V2_CUTOFF } from '@/lib/hrvCoherence'
import { computeZoneBreakdown, computeAvgCoherence, getEvaluativeLabel, computeAchievementScore } from '@/lib/zikirKhafiSummary'
import CoherenceBandChart from '@/components/zikir/CoherenceBandChart'
import BpmOverTimeChart from '@/components/zikir/BpmOverTimeChart'

// ─── Types ─────────────────────────────────────────────────────────────────

interface HrvSessionRow {
  id: string
  session_date: string
  duration_seconds: number
  start_bpm: number
  end_bpm: number
  avg_bpm: number
  min_bpm: number
  max_bpm: number
  rmssd: number
  coherence_score: number // v1 — original RMSSD/meanRR/0.15 ratio formula
  // v2 — ln(RMSSD)/6.5 backfill for pre-existing rows (see
  // hrv_sessions_coherence_v2.sql). Null until that migration runs. Rows
  // saved AFTER the v2 code deploy have their (only) coherence_score already
  // computed with the new formula, so this stays null for those — it's not
  // "missing v2 data," v1 and v2 are simply the same number for them.
  coherence_score_v2: number | null
  consistency_score: number | null
  beat_count: number | null
  stage_achieved: number
  pacing_start_bpm: number | null
  pacing_end_bpm: number | null
  device_name: string
  device_id: string | null
  notes: string | null
  created_at: string
  // Absent on rows saved before the badge series column existed (and on any
  // row saved before the `series` jsonb column migration is run) — treat
  // missing/undefined the same as null, badge computation already handles it.
  series: ZikirBadgeSeriesPoint[] | null
}

type SubView = 'senarai' | 'graf' | 'rekod' | 'statistik'
type GrafRange = 7 | 30 | 0 // 0 = semua

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.round(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTotalTime(totalSeconds: number): string {
  const totalMin = Math.round(totalSeconds / 60)
  const jam = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return jam > 0 ? `${jam}j ${min}m` : `${min}m`
}

function stageLabel(stage: number): string {
  return stage === 3 ? 'Stage 3: Kesedaran Berterusan' : stage === 2 ? 'Stage 2: Zikir Beresonans' : 'Stage 1: Zikir Hati'
}

function stageColorClasses(stage: number): string {
  if (stage === 3) return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  if (stage === 2) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
}

// coherence_score_v2 stays null FOREVER for any row saved after the formula
// cutover — not "not yet backfilled". For those rows coherence_score (v1)
// IS the v2 number already (see HrvSessionRow's own coherence_score_v2
// comment); the backfill column only ever applied to pre-cutover rows.
// Reading coherence_score_v2 directly anywhere in this file was therefore
// silently wrong for every post-cutover row — this is the one place that
// distinction is made, everything else in the file should call these two
// functions instead of touching the column directly.
type V2Status = 'is_v2' | 'backfilled' | 'pending'

function getV2Status(row: Pick<HrvSessionRow, 'coherence_score_v2' | 'created_at'>): V2Status {
  if (new Date(row.created_at) >= COHERENCE_FORMULA_V2_CUTOFF) return 'is_v2'
  return row.coherence_score_v2 !== null ? 'backfilled' : 'pending'
}

// The number to treat as "this row's v2 score" regardless of which of the
// three states above it's in — null only for the genuinely-pending case.
function getEffectiveV2Score(row: Pick<HrvSessionRow, 'coherence_score' | 'coherence_score_v2' | 'created_at'>): number | null {
  if (new Date(row.created_at) >= COHERENCE_FORMULA_V2_CUTOFF) return row.coherence_score
  return row.coherence_score_v2
}

// ─── Main component ─────────────────────────────────────────────────────

export default function HrvSessionsReview({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<HrvSessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [subView, setSubView] = useState<SubView>('senarai')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [grafRange, setGrafRange] = useState<GrafRange>(30)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('hrv_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }: { data: HrvSessionRow[] | null; error: { message: string } | null }) => {
        if (cancelled) return
        if (error) { setLoadError(error.message); setSessions([]); }
        else setSessions(data ?? [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  const stats = useMemo(() => {
    if (sessions.length === 0) return null
    const avgCoherence = sessions.reduce((a, s) => a + s.coherence_score, 0) / sessions.length
    const withV2 = sessions.map(s => getEffectiveV2Score(s)).filter((v): v is number => v !== null)
    const avgCoherenceV2 = withV2.length ? withV2.reduce((a, v) => a + v, 0) / withV2.length : null
    const avgBpm = sessions.reduce((a, s) => a + s.avg_bpm, 0) / sessions.length
    const totalSeconds = sessions.reduce((a, s) => a + s.duration_seconds, 0)
    return { avgCoherence, avgCoherenceV2, avgBpm, totalSeconds }
  }, [sessions])

  const grafData = useMemo(() => {
    const cutoff = grafRange === 0 ? null : subDays(new Date(), grafRange)
    return [...sessions]
      .filter(s => !cutoff || parseISO(s.created_at) >= cutoff)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(s => ({
        label: format(parseISO(s.created_at), 'd/M'),
        coherence: s.coherence_score,
        coherenceV2: getEffectiveV2Score(s),
      }))
  }, [sessions, grafRange])

  const records = useMemo(() => {
    if (sessions.length === 0) return null
    const highestCoherence = sessions.reduce((best, s) => (s.coherence_score > best.coherence_score ? s : best), sessions[0])
    const withV2 = sessions.filter(s => getEffectiveV2Score(s) !== null)
    const highestCoherenceV2 = withV2.length
      ? withV2.reduce((best, s) => ((getEffectiveV2Score(s) as number) > (getEffectiveV2Score(best) as number) ? s : best), withV2[0])
      : null
    const longestSession = sessions.reduce((best, s) => (s.duration_seconds > best.duration_seconds ? s : best), sessions[0])
    const lowestBpm = sessions.reduce((best, s) => (s.min_bpm < best.min_bpm ? s : best), sessions[0])
    const stage3Count = sessions.filter(s => s.stage_achieved === 3).length

    // Longest streak of consecutive days with >=1 session
    const uniqueDates = [...new Set(sessions.map(s => s.session_date))].sort((a, b) => b.localeCompare(a))
    let streak = 0
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if (uniqueDates[i] === expected) streak++
      else break
    }

    return { highestCoherence, highestCoherenceV2, longestSession, lowestBpm, stage3Count, streak }
  }, [sessions])

  const badgeCounts = useMemo(() => {
    return ZIKIR_KHAFI_BADGES.map(badge => ({
      badge,
      count: sessions.filter(s => isZikirBadgeEarned(badge, { avgBpm: s.avg_bpm, coherenceScore: s.coherence_score, series: s.series ?? null })).length,
    }))
  }, [sessions])

  const weeklyStats = useMemo(() => {
    const now = new Date()
    const oneWeekAgo = subDays(now, 7)
    const twoWeeksAgo = subDays(now, 14)
    const thisWeek = sessions.filter(s => parseISO(s.created_at) >= oneWeekAgo)
    const lastWeek = sessions.filter(s => {
      const d = parseISO(s.created_at)
      return d >= twoWeeksAgo && d < oneWeekAgo
    })
    const avg = (arr: HrvSessionRow[], key: 'coherence_score' | 'start_bpm' | 'end_bpm') =>
      arr.length ? arr.reduce((a, s) => a + s[key], 0) / arr.length : null
    const avgV2 = (arr: HrvSessionRow[]) => {
      const withV2 = arr.map(s => getEffectiveV2Score(s)).filter((v): v is number => v !== null)
      return withV2.length ? withV2.reduce((a, v) => a + v, 0) / withV2.length : null
    }
    const stageCounts = [1, 2, 3].map(stage => sessions.filter(s => s.stage_achieved === stage).length)
    return {
      thisWeekCoherence: avg(thisWeek, 'coherence_score'),
      lastWeekCoherence: avg(lastWeek, 'coherence_score'),
      thisWeekCoherenceV2: avgV2(thisWeek),
      lastWeekCoherenceV2: avgV2(lastWeek),
      avgStartBpm: avg(sessions, 'start_bpm'),
      avgEndBpm: avg(sessions, 'end_bpm'),
      stageCounts,
    }
  }, [sessions])

  const SUB_TABS: { id: SubView; label: string }[] = [
    { id: 'senarai', label: '📅 Senarai' },
    { id: 'graf', label: '📊 Graf' },
    { id: 'rekod', label: '🏆 Rekod' },
    { id: 'statistik', label: '📈 Statistik' },
  ]

  return (
    <div className="max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
      <div className="zk-glass rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
          <h2 className="text-lg font-medium text-white">📊 Review Sesi HRV</h2>
          <span className="text-xs text-gray-400">Number of Sessions: <span className="text-emerald-400 font-semibold">{sessions.length}</span></span>
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubView(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                subView === tab.id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-500 text-center py-10">Memuatkan data...</p>}
        {loadError && (
          <p className="text-sm text-red-400 text-center py-10">
            Gagal muat data — pastikan table <code className="bg-gray-900 px-1 py-0.5 rounded">hrv_sessions</code> wujud. ({loadError})
          </p>
        )}
        {!loading && !loadError && sessions.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-10">Tiada sesi eksperimen disimpan lagi.</p>
        )}

        {!loading && !loadError && sessions.length > 0 && (
          <>
            {subView === 'senarai' && (
              <div className="space-y-2">
                <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-gray-500 px-3 pb-1">
                  <div className="col-span-2">Tarikh</div>
                  <div className="col-span-1">Tempoh</div>
                  <div className="col-span-2">Skor HRV (v1 / v2)</div>
                  <div className="col-span-3">BPM Permulaan → Selepas</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Peranti</div>
                </div>
                {sessions.map(s => {
                  const isOpen = expandedId === s.id
                  const bpmDelta = s.end_bpm - s.start_bpm
                  return (
                    <div key={s.id} className="rounded-xl border border-gray-800 bg-gray-950/30 overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isOpen ? null : s.id)}
                        className="w-full text-left px-3 py-3 grid grid-cols-2 md:grid-cols-12 gap-2 items-center hover:bg-gray-900/40 transition-colors"
                      >
                        <div className="md:col-span-2 text-sm text-gray-200">{format(parseISO(s.created_at), 'd/M/yy')}</div>
                        <div className="md:col-span-1 text-sm text-gray-400 font-mono">{formatDuration(s.duration_seconds)}</div>
                        <div className="md:col-span-2 text-sm font-semibold text-emerald-400">
                          {s.coherence_score}%
                          <span className="text-gray-500 font-normal text-xs"> / {getEffectiveV2Score(s) !== null ? `${getEffectiveV2Score(s)}%` : '—'}</span>
                        </div>
                        <div className="md:col-span-3 text-sm text-gray-300">
                          {s.start_bpm} → {s.end_bpm} <span className={bpmDelta < 0 ? 'text-emerald-400' : 'text-gray-500'}>({bpmDelta <= 0 ? '↓' : '↑'}{Math.abs(bpmDelta)})</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${stageColorClasses(s.stage_achieved)}`}>
                            Stage {s.stage_achieved}
                          </span>
                        </div>
                        <div className="md:col-span-2 text-xs text-gray-500 flex items-center justify-between">
                          <span>{s.device_name}</span>
                          <span className="text-gray-600">{isOpen ? '︿' : '﹀'}</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-800/60 space-y-1.5 text-xs text-gray-400">
                          <p>📅 {format(parseISO(s.created_at), 'd MMMM yyyy — HH:mm')}</p>
                          <p>🫀 BPM: {s.start_bpm} → {s.end_bpm} ({bpmDelta <= 0 ? '↓' : '↑'} {Math.abs(bpmDelta)} BPM) · Purata {s.avg_bpm} · Min/Max {s.min_bpm}–{s.max_bpm}</p>
                          {(() => {
                            const v2Status = getV2Status(s)
                            // 'is_v2': coherence_score (v1 column) already IS the
                            // v2-formula number for this row — showing a "v1 / v2"
                            // split here would just show the same number twice
                            // under different labels, and "belum di-backfill" would
                            // be flatly wrong (nothing is pending for this row).
                            const skorLine = v2Status === 'is_v2'
                              ? `💜 Skor HRV (ln-RMSSD): ${s.coherence_score}%`
                              : `💜 Skor Lama (v1): ${s.coherence_score}% · Skor Baharu ln-RMSSD (v2): ${
                                  v2Status === 'backfilled' ? `${s.coherence_score_v2}%` : '— (belum di-backfill)'
                                }`
                            return (
                              <p>{skorLine} | RMSSD: {s.rmssd}ms{s.consistency_score !== null && ` | Konsistensi: ${s.consistency_score}%`}</p>
                            )
                          })()}
                          {(() => {
                            // Per-point series coherence is baked in at sample
                            // time under whatever formula was live then — a
                            // row saved before the v2 cutover has v1-formula
                            // points that can't be recalculated (no raw R-R
                            // stored per point, unlike coherence_score's own
                            // v1/v2 pair). Never plot those against v2-
                            // calibrated bands (or derive zone/score/BPM-chart
                            // from them); fall back to a plain note.
                            const seriesEligible = s.series && s.series.length > 0 && new Date(s.created_at) >= COHERENCE_FORMULA_V2_CUTOFF
                            if (!seriesEligible) {
                              return (
                                <p className="text-gray-600 italic">
                                  {s.series && s.series.length > 0
                                    ? '📉 Carta jalur koheren tiada — series sesi ini formula lama (v1), tak boleh dibandingkan dengan jalur v2.'
                                    : '📉 Carta jalur koheren tiada — sesi ini tiada data series tersimpan.'}
                                </p>
                              )
                            }
                            const series = s.series as ZikirBadgeSeriesPoint[]
                            const zoneBreakdown = computeZoneBreakdown(series)
                            const evaluativeLabel = getEvaluativeLabel({ avgBpm: s.avg_bpm, coherenceScore: s.coherence_score, series })
                            const avgCoherence = computeAvgCoherence(series)
                            const achievementScore = zoneBreakdown && avgCoherence !== null
                              ? computeAchievementScore(avgCoherence, s.duration_seconds / 60, zoneBreakdown.high)
                              : null
                            return (
                              <>
                                <p className="flex items-center gap-2">
                                  <span className="text-emerald-300 font-medium">✨ {evaluativeLabel}</span>
                                  {achievementScore !== null && <span className="text-purple-300">· Skor: {achievementScore}</span>}
                                </p>
                                {/* Same segmented-bar idiom as the stage/badge
                                    breakdowns in the Statistik tab below —
                                    reused, not a new pattern. */}
                                {zoneBreakdown && (
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden flex">
                                      {COHERENCE_BANDS.map(band => zoneBreakdown[band.id] > 0 && (
                                        <div key={band.id} style={{ width: `${zoneBreakdown[band.id]}%`, background: band.color }} />
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap font-mono">
                                      {zoneBreakdown.low}/{zoneBreakdown.mid}/{zoneBreakdown.high}%
                                    </span>
                                  </div>
                                )}
                                <CoherenceBandChart series={series} className="py-1" />
                                <BpmOverTimeChart series={series} className="py-1" />
                              </>
                            )
                          })()}
                          <p>⭐ {stageLabel(s.stage_achieved)}</p>
                          {(() => {
                            const earned = getEarnedZikirBadges({ avgBpm: s.avg_bpm, coherenceScore: s.coherence_score, series: s.series ?? null })
                            return earned.length > 0 && (
                              <p className="flex flex-wrap items-center gap-1.5">
                                🏅 {earned.map(b => (
                                  <span key={b.id} className="text-[10px] px-2 py-0.5 rounded-full border border-purple-400/40 bg-purple-400/10 text-purple-200">
                                    {b.label}
                                  </span>
                                ))}
                              </p>
                            )
                          })()}
                          <p>📱 {s.device_name}{s.device_id && ` (${s.device_id})`}{s.beat_count !== null && ` · Ketukan: ${s.beat_count}`}</p>
                          {s.pacing_start_bpm !== null && s.pacing_end_bpm !== null && (
                            <p>🎯 Pacing: {s.pacing_start_bpm} → {s.pacing_end_bpm} BPM</p>
                          )}
                          {s.notes && <p>📝 {s.notes}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
                {stats && (
                  <div className="flex flex-wrap gap-6 pt-3 mt-3 border-t border-gray-800 text-xs text-gray-400">
                    <span>Avg Skor (v1): <span className="text-emerald-400 font-semibold">{stats.avgCoherence.toFixed(0)}%</span></span>
                    <span>Avg Skor (v2): <span className="text-amber-400 font-semibold">{stats.avgCoherenceV2 !== null ? `${stats.avgCoherenceV2.toFixed(0)}%` : '—'}</span></span>
                    <span>Avg BPM: <span className="text-gray-200 font-semibold">{stats.avgBpm.toFixed(1)}</span></span>
                    <span>Total Masa: <span className="text-gray-200 font-semibold">{formatTotalTime(stats.totalSeconds)}</span></span>
                  </div>
                )}
              </div>
            )}

            {subView === 'graf' && (
              <div className="space-y-4">
                <div className="flex gap-2 justify-end">
                  {([7, 30, 0] as GrafRange[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setGrafRange(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        grafRange === r ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {r === 0 ? 'Semua' : `${r} hari`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> v1 (lama)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> v2 (ln-RMSSD — sama dengan v1 untuk sesi selepas 23/7)</span>
                </div>
                <div className="h-72 bg-black/30 rounded-xl border border-gray-900 p-2">
                  {grafData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-600">Tiada data dalam julat ini</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={grafData} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value, name) => [`${value}%`, name === 'coherenceV2' ? 'v2 (ln-RMSSD)' : 'v1 (lama)']}
                        />
                        <Line type="monotone" dataKey="coherence" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="coherenceV2" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {subView === 'rekod' && records && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Skor Tertinggi (v1 lama)', value: `${records.highestCoherence.coherence_score}%`, sub: format(parseISO(records.highestCoherence.created_at), 'd/M/yy'), color: 'text-emerald-400' },
                  ...(records.highestCoherenceV2 ? [{ label: 'Skor Tertinggi (v2 ln-RMSSD)', value: `${getEffectiveV2Score(records.highestCoherenceV2)}%`, sub: format(parseISO(records.highestCoherenceV2.created_at), 'd/M/yy'), color: 'text-amber-400' }] : []),
                  { label: 'Sesi Terpanjang', value: formatDuration(records.longestSession.duration_seconds), sub: format(parseISO(records.longestSession.created_at), 'd/M/yy'), color: 'text-blue-400' },
                  { label: 'BPM Terendah (Paling Tenang)', value: `${records.lowestBpm.min_bpm} BPM`, sub: format(parseISO(records.lowestBpm.created_at), 'd/M/yy'), color: 'text-purple-400' },
                  { label: 'Streak Terpanjang', value: `${records.streak} hari`, sub: 'berturut-turut', color: 'text-amber-400' },
                  { label: 'Stage 3 Paling Kerap', value: `${records.stage3Count} sesi`, sub: `daripada ${sessions.length} sesi`, color: 'text-amber-300' },
                ].map(r => (
                  <div key={r.label} className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">{r.label}</p>
                    <p className={`text-2xl font-bold ${r.color}`}>{r.value}</p>
                    <p className="text-[10px] text-gray-600">{r.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {subView === 'statistik' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Purata Skor v1 (lama) — Minggu Ini vs Lalu</p>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-emerald-400">
                        {weeklyStats.thisWeekCoherence !== null ? `${weeklyStats.thisWeekCoherence.toFixed(0)}%` : '—'}
                      </span>
                      <span className="text-gray-600">vs</span>
                      <span className="text-lg text-gray-500">
                        {weeklyStats.lastWeekCoherence !== null ? `${weeklyStats.lastWeekCoherence.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Purata Skor v2 (ln-RMSSD) — Minggu Ini vs Lalu</p>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-amber-400">
                        {weeklyStats.thisWeekCoherenceV2 !== null ? `${weeklyStats.thisWeekCoherenceV2.toFixed(0)}%` : '—'}
                      </span>
                      <span className="text-gray-600">vs</span>
                      <span className="text-lg text-gray-500">
                        {weeklyStats.lastWeekCoherenceV2 !== null ? `${weeklyStats.lastWeekCoherenceV2.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Purata BPM — Sebelum vs Selepas</p>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-200">
                        {weeklyStats.avgStartBpm !== null ? weeklyStats.avgStartBpm.toFixed(1) : '—'}
                      </span>
                      <span className="text-gray-600">→</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        {weeklyStats.avgEndBpm !== null ? weeklyStats.avgEndBpm.toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Bilangan Sesi Mengikut Stage</p>
                  <div className="space-y-2">
                    {[1, 2, 3].map((stage, i) => {
                      const count = weeklyStats.stageCounts[i]
                      const pct = sessions.length ? (count / sessions.length) * 100 : 0
                      return (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-20 flex-shrink-0">Stage {stage}</span>
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full ${stage === 3 ? 'bg-amber-500' : stage === 2 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-300 w-8 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {stats && (
                  <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Jumlah Masa Berzikir Dengan Device</p>
                    <p className="text-2xl font-bold text-gray-200">{formatTotalTime(stats.totalSeconds)}</p>
                  </div>
                )}

                {/* Badge thresholds are still PLACEHOLDER (src/config/zikirKhafiBadges.ts)
                    — this tile exists to help judge, from real sessions, whether the
                    numbers are actually achievable/meaningful before finalizing them. */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Bilangan Sesi Mengikut Badge (threshold placeholder)</p>
                  <div className="space-y-2">
                    {badgeCounts.map(({ badge, count }) => {
                      const pct = sessions.length ? (count / sessions.length) * 100 : 0
                      return (
                        <div key={badge.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-32 flex-shrink-0 truncate">{badge.label}</span>
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-300 w-8 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
