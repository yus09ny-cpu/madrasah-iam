import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { format, subDays } from 'date-fns'
import type { MuhasabahEntry, MuhasabahAnswer } from '@/types'

export function useTodayMuhasabah() {
  const { user } = useAuthStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['muhasabah', user?.id, today],
    queryFn: async () => {
      if (!user) return null
      try {
        const { data, error } = await supabase
          .from('muhasabah_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()
        if (error) return null
        return data as MuhasabahEntry | null
      } catch {
        return null
      }
    },
    enabled: !!user,
    retry: false,
  })
}

export function useSaveMuhasabah() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ answers, mood }: { answers: MuhasabahAnswer[]; mood: number }) => {
      if (!user) throw new Error('Perlu log masuk')
      const today = format(new Date(), 'yyyy-MM-dd')
      // Baca token terus dari localStorage — bypass getSession() yang hang
      const raw = localStorage.getItem('madrasah-iam-auth')
      const stored = raw ? JSON.parse(raw) : null
      const accessToken = stored?.access_token
      if (!accessToken) throw new Error('Tiada access token')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/muhasabah_entries`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({ user_id: user.id, date: today, answers, mood }),
        }
      )
      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`HTTP ${res.status}: ${errBody}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muhasabah', user?.id] })
    },
  })
}

export function useMuhasabahHistory(limit = 30) {
  const { user } = useAuthStore()
  const isFree = (user?.tier ?? 'free') === 'free'

  return useQuery({
    queryKey: ['muhasabah-history', user?.id, limit, isFree],
    queryFn: async () => {
      if (!user) return []
      try {
        let query = supabase
          .from('muhasabah_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(limit)

        // Free — paparan dihadkan kepada 7 hari terkini. Data tidak dipadam,
        // hanya tidak dipaparkan; akan kembali kelihatan jika upgrade ke Pro.
        if (isFree) {
          const cutoff = format(subDays(new Date(), 7), 'yyyy-MM-dd')
          query = query.gte('date', cutoff)
        }

        const { data, error } = await query
        if (error) return []
        return (data ?? []) as MuhasabahEntry[]
      } catch {
        return []
      }
    },
    enabled: !!user,
    retry: false,
  })
}
