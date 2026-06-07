import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'
import type { ZikirSession } from '@/types'

export function useZikirCounter(target: number) {
  const [count, setCount] = useState(0)
  const progress = Math.min((count / target) * 100, 100)
  const isComplete = count >= target

  const increment = useCallback(() => {
    setCount((prev) => Math.min(prev + 1, target))
  }, [target])

  const reset = useCallback(() => setCount(0), [])

  return { count, progress, isComplete, increment, reset }
}

export function useTodayZikir() {
  const { user } = useAuthStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['zikir', user?.id, today],
    queryFn: async () => {
      if (!user) return []
      try {
        const { data, error } = await supabase
          .from('zikir_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
        if (error) return []
        return (data ?? []) as ZikirSession[]
      } catch {
        return []
      }
    },
    enabled: !!user,
    retry: false,
  })
}

export function useSaveZikir() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (session: Omit<ZikirSession, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Perlu log masuk')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('zikir_sessions') as any)
        .insert({ ...session, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as ZikirSession
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zikir', user?.id] })
    },
  })
}
