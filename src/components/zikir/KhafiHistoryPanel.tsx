import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { TIER_META, type BpmTier } from '@/lib/bpmTiers'

// Coherence/consistency were fabricated for every session before this fix
// shipped (commit 1c674cc — BLE mode, and the null-gating for tap-tempo,
// didn't exist before it). Any row with a non-null value recorded before
// this moment is untrustworthy legacy data, not a real measurement — flag
// it rather than deleting it, since the row itself is still a valid record
// that a session happened.
const COHERENCE_FIX_CUTOFF = new Date('2026-07-09T17:02:40+08:00')

interface KhafiSession {
  session_date: string
  duration_min: number
  actual_sec: number
  pre_bpm: number | null
  final_bpm: number | null
  avg_bpm: number
  coherence: number | null
  consistency: number | null
  session_mode: 'tap' | 'ble' | null
  dominant_tier: BpmTier | null
  deepest_tier: BpmTier | null
  created_at: string
}

// Shared by wherever the Zikir Khafi history/trend view is mounted — was
// originally only reachable from PintuRezekiPage's Rekod tab, moved here so
// it lives alongside the practice itself (see AmalanPage.tsx's Dashboard).
export default function KhafiHistoryPanel({ userId, isPro, onUpgrade }: {
  userId: string
  isPro: boolean
  onUpgrade: () => void
}) {
  const { t } = useTranslation()
  const [khafiSessions, setKhafiSessions] = useState<KhafiSession[]>([])
  const [khafiLoading, setKhafiLoading] = useState(false)
  const [trendDays, setTrendDays] = useState<7 | 30>(7)
  const [trendSessions, setTrendSessions] = useState<{ session_date: string; dominant_tier: BpmTier | null }[]>([])

  useEffect(() => {
    if (!userId || !isPro) return
    setKhafiLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('zikir_khafi_sessions') as any)
      .select('session_date, duration_min, actual_sec, pre_bpm, final_bpm, avg_bpm, coherence, consistency, session_mode, dominant_tier, deepest_tier, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: KhafiSession[] | null }) => {
        setKhafiSessions(data ?? [])
        setKhafiLoading(false)
      })
      .catch(() => setKhafiLoading(false))
  }, [userId, isPro])

  // Separate query for the trend chart, filtered by an actual date window
  // (not the capped "last 20 sessions" list above) so day-bucketing reflects
  // a real time range regardless of how many sessions fall inside it.
  useEffect(() => {
    if (!userId || !isPro) return
    const cutoff = format(subDays(new Date(), trendDays - 1), 'yyyy-MM-dd')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('zikir_khafi_sessions') as any)
      .select('session_date, dominant_tier')
      .eq('user_id', userId)
      .eq('session_mode', 'ble')
      .gte('session_date', cutoff)
      .then(({ data }: { data: { session_date: string; dominant_tier: BpmTier | null }[] | null }) => {
        setTrendSessions(data ?? [])
      })
      .catch(() => {})
  }, [userId, isPro, trendDays])

  if (!isPro) {
    return (
      <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-5 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#a78bfa15] border border-[#a78bfa30] flex items-center justify-center">
          <Lock size={20} className="text-[#a78bfa]" />
        </div>
        <div className="space-y-1.5">
          <p className="font-serif text-[#a78bfa] font-medium">{t('amalan.khafi_player.riwayat_tajuk')}</p>
          <p className="text-[#8a7a65] text-xs leading-relaxed">{t('amalan.khafi_player.riwayat_terkunci_desc')}</p>
        </div>
        <button
          onClick={onUpgrade}
          className="w-full py-3 rounded-2xl text-sm font-medium bg-[#a78bfa20] border border-[#a78bfa50] text-[#a78bfa] hover:bg-[#a78bfa30] transition-colors"
        >
          {t('amalan.khafi_player.riwayat_terkunci_btn')}
        </button>
      </div>
    )
  }

  // Dominant-tier trend — average of dominant_tier across BLE sessions per
  // day (1=Hilang Tumpuan ... 5=Kesedaran Berterusan), so a rising trend
  // visually means "reaching calmer tiers more often over time."
  const trendData = Array.from({ length: trendDays }, (_, i) => {
    const date = subDays(new Date(), trendDays - 1 - i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const daySessions = trendSessions.filter(s => s.session_date === dateStr && s.dominant_tier !== null)
    const avgTier = daySessions.length > 0
      ? daySessions.reduce((sum, s) => sum + (s.dominant_tier as number), 0) / daySessions.length
      : null
    return { label: format(date, 'dd/MM'), isToday: i === trendDays - 1, avgTier, hasData: daySessions.length > 0 }
  })
  const hasTrendData = trendData.some(d => d.hasData)

  return (
    <div className="space-y-4">
      {/* Dominant-tier trend — BLE sessions only, since tap-tempo has no
          genuine tier data (see the BLE-only gating in ZikirKhafiPlayer). */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[#e8dcc8] text-sm font-medium">{t('pintu.rekod.trend_tajuk')}</p>
          <div className="flex gap-1">
            {([7, 30] as const).map(d => (
              <button key={d} onClick={() => setTrendDays(d)}
                className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all',
                  trendDays === d ? 'bg-[#a78bfa20] border-[#a78bfa50] text-[#a78bfa]' : 'border-[#1e2d40] text-[#8a7a65]')}>
                {d === 7 ? t('pintu.rekod.trend_7hari') : t('pintu.rekod.trend_30hari')}
              </button>
            ))}
          </div>
        </div>
        {!hasTrendData ? (
          <p className="text-[#8a7a65] text-xs text-center py-3">{t('pintu.rekod.trend_tiada')}</p>
        ) : (
          <div className="flex items-end gap-1 h-16">
            {trendData.map((day, i) => (
              <div key={i} className="flex-1 h-full flex items-end" title={day.hasData ? `${day.label}: ${day.avgTier?.toFixed(1)}` : day.label}>
                <div className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: day.hasData ? `${((day.avgTier ?? 0) / 5) * 100}%` : '3px',
                    minHeight: '3px',
                    backgroundColor: day.hasData
                      ? TIER_META[Math.round(day.avgTier ?? 1) as BpmTier].color
                      : day.isToday ? '#2a3d55' : '#1e2d40',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-4 space-y-3">
        <p className="text-[#e8dcc8] text-sm font-medium">{t('pintu.rekod.khafi_tajuk')}</p>
        {khafiLoading ? (
          <p className="text-[#8a7a65] text-xs text-center py-3 animate-pulse">···</p>
        ) : khafiSessions.length === 0 ? (
          <p className="text-[#8a7a65] text-xs text-center py-3">{t('pintu.rekod.khafi_tiada')}</p>
        ) : (
          <div>
            {khafiSessions.map((s, i) => {
              const [yr, mo, dy] = s.session_date.split('-')
              const displayDate = `${dy}/${mo}/${yr.slice(2)}`
              const mins = s.actual_sec ? Math.max(1, Math.round(s.actual_sec / 60)) : (s.duration_min || 1)
              const isBle = s.session_mode === 'ble'
              // final_bpm replaces the old manually re-tapped post_bpm — the
              // session's own tracked end value, captured automatically.
              const bpmDelta = s.pre_bpm !== null && s.final_bpm !== null ? Math.round(s.final_bpm - s.pre_bpm) : null
              // Pre-fix rows never had session_mode/dominant_tier at all (those
              // columns didn't exist), so a non-null coherence there is always
              // the old fabricated ~100% value, not a real measurement.
              const isLegacyCoherence = s.coherence !== null && new Date(s.created_at) < COHERENCE_FIX_CUTOFF
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#1e2d40] last:border-0">
                  <div className="space-y-0.5">
                    <p className="text-[#e8dcc8] text-xs font-medium">{displayDate}</p>
                    <p className="text-[#8a7a65] text-[10px]">
                      {mins} min
                      {/* coherence is only ever non-null for a BLE session —
                          never format a null/tap-tempo value as a percentage */}
                      {!isLegacyCoherence && isBle && s.coherence !== null && ` · ${t('amalan.khafi_player.koheren')} ${(s.coherence * 100).toFixed(0)}%`}
                    </p>
                    {isLegacyCoherence && (
                      <span
                        title={t('amalan.khafi_player.data_lama_tooltip')}
                        className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium text-amber-400/80 bg-amber-400/10"
                      >
                        ⚠ {t('amalan.khafi_player.data_lama')}
                      </span>
                    )}
                    {!isLegacyCoherence && isBle && s.dominant_tier !== null && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={{ color: TIER_META[s.dominant_tier].color, background: TIER_META[s.dominant_tier].color + '15' }}>
                        {t(`amalan.khafi_player.${TIER_META[s.dominant_tier].key}`)}
                      </span>
                    )}
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[#a78bfa] text-xs">{s.avg_bpm.toFixed(0)} bpm</p>
                    {bpmDelta !== null && (
                      <p className={cn('text-[10px]', bpmDelta < 0 ? 'text-[#4ade80]' : 'text-[#8a7a65]')}>
                        {bpmDelta < 0 ? `↓ ${Math.abs(bpmDelta)}` : `↑ ${bpmDelta}`}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
