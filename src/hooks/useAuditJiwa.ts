import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Database } from '@/types/database'

export type AuditJiwaEntry = Database['public']['Tables']['audit_jiwa_entries']['Row']

export function useTodayAuditJiwa() {
  const { user } = useAuthStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['audit-jiwa', user?.id, today],
    queryFn: async () => {
      if (!user) return null
      try {
        const { data, error } = await supabase
          .from('audit_jiwa_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('tarikh', today)
          .maybeSingle()
        if (error) return null
        return data as AuditJiwaEntry | null
      } catch {
        return null
      }
    },
    enabled: !!user,
    retry: false,
  })
}

/**
 * Sejarah Audit Jiwa. Free — paparan dihadkan kepada 7 hari terkini.
 * Data TIDAK dipadam; akan kembali kelihatan sepenuhnya jika upgrade ke Pro.
 */
export function useAuditJiwaHistory(limit = 30) {
  const { user } = useAuthStore()
  const isFree = (user?.tier ?? 'free') === 'free'

  return useQuery({
    queryKey: ['audit-jiwa-history', user?.id, limit, isFree],
    queryFn: async () => {
      if (!user) return { entries: [] as AuditJiwaEntry[], limited: false }
      try {
        let query = supabase
          .from('audit_jiwa_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('tarikh', { ascending: false })
          .limit(limit)

        if (isFree) {
          const cutoff = format(subDays(new Date(), 7), 'yyyy-MM-dd')
          query = query.gte('tarikh', cutoff)
        }

        const { data, error } = await query
        if (error) return { entries: [] as AuditJiwaEntry[], limited: isFree }
        return { entries: (data ?? []) as AuditJiwaEntry[], limited: isFree }
      } catch {
        return { entries: [] as AuditJiwaEntry[], limited: isFree }
      }
    },
    enabled: !!user,
    retry: false,
  })
}


export function useSaveAuditJiwa() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: {
      pillar_raga: number
      pillar_hati: number
      pillar_akal: number
      pillar_ruh: number
      jumlah_skor: number
      cadangan_ai: string
      soalan_dijawab: number
    }) => {
      if (!user) throw new Error('Perlu log masuk')
      const today = format(new Date(), 'yyyy-MM-dd')
      // Baca token terus dari localStorage — bypass getSession() yang hang
      const raw = localStorage.getItem('madrasah-iam-auth')
      const stored = raw ? JSON.parse(raw) : null
      const accessToken = stored?.access_token
      if (!accessToken) throw new Error('Tiada access token')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_jiwa_entries`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            user_id: user.id,
            tarikh: today,
            selesai: true,
            ...entry,
          }),
        }
      )
      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`HTTP ${res.status}: ${errBody}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-jiwa', user?.id] })
    },
  })
}
