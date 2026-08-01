import { useQuery } from '@tanstack/react-query'
import { format, subDays, differenceInCalendarDays, eachDayOfInterval } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { AuditJiwaEntry } from '@/hooks/useAuditJiwa'
import type { PillarKey, PillarScores } from '@/lib/pillars'
import {
  LIVE_WINDOW_DAYS,
  computeLiveAdjustment,
  applyLiveAdjustment,
  type ActivityType,
  type ActivityDatesByType,
} from '@/lib/pillarLiveScore'

export interface LivePillarResult {
  baseline: PillarScores
  baselineDate: string
  displayScores: PillarScores
  weakestPillar: PillarKey
}

/**
 * Skor pillar (Raga/Hati/Akal/Ruh) baseline dari Audit Jiwa terkini yang
 * disiapkan, dilaras "hidup" ikut aktiviti solat/zikir/muhasabah sejak
 * tarikh itu (maksimum LIVE_WINDOW_DAYS hari lihat-belakang). Pulangkan
 * null kalau pengguna tidak pernah siapkan Audit Jiwa langsung.
 */
export function usePillarLiveScore() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['pillar-live-score', user?.id],
    queryFn: async (): Promise<LivePillarResult | null> => {
      if (!user) return null

      const { data: latest, error: latestErr } = await supabase
        .from('audit_jiwa_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('selesai', true)
        .order('tarikh', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: AuditJiwaEntry | null, error: unknown }

      if (latestErr || !latest) return null

      const baseline: PillarScores = {
        raga: latest.pillar_raga,
        hati: latest.pillar_hati,
        akal: latest.pillar_akal,
        ruh: latest.pillar_ruh,
      }

      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      const daysSinceBaseline = differenceInCalendarDays(today, new Date(latest.tarikh))
      const windowDays = Math.max(0, Math.min(LIVE_WINDOW_DAYS, daysSinceBaseline))

      if (windowDays === 0) {
        const weakestPillar = (Object.entries(baseline) as [PillarKey, number][])
          .sort(([, a], [, b]) => a - b)[0][0]
        return { baseline, baselineDate: latest.tarikh, displayScores: baseline, weakestPillar }
      }

      const windowStart = format(subDays(today, windowDays - 1), 'yyyy-MM-dd')
      const windowDates = eachDayOfInterval({ start: subDays(today, windowDays - 1), end: today })
        .map(d => format(d, 'yyyy-MM-dd'))

      const [{ data: solatRows }, { data: zikirRows }, { data: amalanRows }, { data: muhasabahRows }] =
        await Promise.all([
          supabase.from('solat_entries').select('date, prayers')
            .eq('user_id', user.id).gte('date', windowStart).lte('date', todayStr),
          supabase.from('zikir_sessions').select('date')
            .eq('user_id', user.id).eq('completed', true).gte('date', windowStart).lte('date', todayStr),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from('amalan_sessions') as any).select('session_date, jahar_kiraan, khafi_minit')
            .eq('user_id', user.id).gte('session_date', windowStart).lte('session_date', todayStr),
          supabase.from('muhasabah_entries').select('date')
            .eq('user_id', user.id).gte('date', windowStart).lte('date', todayStr),
        ])

      const solatDates = new Set<string>()
      ;(solatRows ?? []).forEach((r: { date: string; prayers: unknown }) => {
        const prayers = Array.isArray(r.prayers) ? (r.prayers as Array<{ completed?: boolean }>) : []
        if (prayers.some(p => p?.completed)) solatDates.add(r.date)
      })

      const zikirDates = new Set<string>()
      ;(zikirRows ?? []).forEach((r: { date: string }) => zikirDates.add(r.date))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(amalanRows ?? []).forEach((r: any) => {
        if ((r.jahar_kiraan ?? 0) > 0 || (r.khafi_minit ?? 0) > 0) zikirDates.add(r.session_date)
      })

      const muhasabahDates = new Set<string>()
      ;(muhasabahRows ?? []).forEach((r: { date: string }) => muhasabahDates.add(r.date))

      const activityDatesByType: ActivityDatesByType = {
        solat: solatDates,
        zikir: zikirDates,
        muhasabah: muhasabahDates,
      } as Record<ActivityType, Set<string>>

      const adjustment = computeLiveAdjustment(activityDatesByType, windowDates)
      const displayScores = applyLiveAdjustment(baseline, adjustment)
      const weakestPillar = (Object.entries(displayScores) as [PillarKey, number][])
        .sort(([, a], [, b]) => a - b)[0][0]

      return { baseline, baselineDate: latest.tarikh, displayScores, weakestPillar }
    },
    enabled: !!user,
    retry: false,
  })
}
