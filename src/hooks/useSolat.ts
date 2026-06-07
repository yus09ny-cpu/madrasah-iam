import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'
import type { SolatEntry, PrayerRecord } from '@/types'

const PRAYERS: PrayerRecord['name'][] = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak']

const DEFAULT_PRAYERS = (): Partial<SolatEntry> => ({
  prayers: PRAYERS.map((name) => ({ name, completed: false, on_time: false })),
})

export function useTodaySolat() {
  const { user } = useAuthStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['solat', user?.id, today],
    queryFn: async () => {
      if (!user) return DEFAULT_PRAYERS()
      try {
        const { data, error } = await supabase
          .from('solat_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()
        if (error || !data) return { ...DEFAULT_PRAYERS(), date: today }
        return data as SolatEntry
      } catch {
        return { ...DEFAULT_PRAYERS(), date: today }
      }
    },
    enabled: !!user,
    retry: false,
  })
}

export function useUpdateSolat() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (prayers: PrayerRecord[]) => {
      if (!user) throw new Error('Perlu log masuk')
      const today = format(new Date(), 'yyyy-MM-dd')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('solat_entries') as any)
        .upsert(
          { user_id: user.id, date: today, prayers },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single()
      if (error) throw error
      return data as SolatEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solat', user?.id] })
    },
  })
}
