import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns'

export function useStreak() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['streak', user?.id],
    queryFn: async () => {
      if (!user) return { current: 0, longest: 0, lastEntry: null }
      try {
        const { data, error } = await supabase
          .from('muhasabah_entries')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(365)

        if (error || !data || data.length === 0) {
          return { current: 0, longest: 0, lastEntry: null }
        }

        const rows = data as { date: string }[]
        const dates = rows.map((d) => d.date).sort((a, b) => (a > b ? -1 : 1))
        const today = format(new Date(), 'yyyy-MM-dd')
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

        const mostRecent = dates[0]
        if (mostRecent !== today && mostRecent !== yesterday) {
          return { current: 0, longest: calcLongest(dates), lastEntry: mostRecent }
        }

        let current = 1
        for (let i = 1; i < dates.length; i++) {
          const diff = differenceInCalendarDays(parseISO(dates[i - 1]), parseISO(dates[i]))
          if (diff === 1) current++
          else break
        }

        return { current, longest: Math.max(current, calcLongest(dates)), lastEntry: mostRecent }
      } catch {
        return { current: 0, longest: 0, lastEntry: null }
      }
    },
    enabled: !!user,
    retry: false,
  })
}

function calcLongest(dates: string[]): number {
  if (dates.length === 0) return 0
  let longest = 1
  let current = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = differenceInCalendarDays(parseISO(dates[i - 1]), parseISO(dates[i]))
    if (diff === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}
