import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Database } from '@/types/database'

export type SoalHatiSession = Database['public']['Tables']['soal_hati_sessions']['Row']

// Satu baris per (user_id, bab_id) — reka bentuk supaya bab baharu automatik
// dapat progress-tracking sendiri tanpa migrate skema (lihat soal_hati_sessions
// SQL di scratchpad sesi ini untuk unique constraint (user_id, bab_id)).
export function useSoalHatiSession(babId: string) {
  const { user } = useAuthStore()
  const [session, setSession] = useState<SoalHatiSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setSession(null)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('soal_hati_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('bab_id', babId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setSession(error ? null : (data as SoalHatiSession | null))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, babId])

  const saveProgress = useCallback(
    async (langkahTerakhir: number, jawapanCheckpoint: Record<string, string>, completed = false) => {
      if (!user) return
      const payload = {
        user_id: user.id,
        bab_id: babId,
        langkah_terakhir: langkahTerakhir,
        jawapan_checkpoint: jawapanCheckpoint,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('soal_hati_sessions') as any)
          .upsert(payload, { onConflict: 'user_id,bab_id' })
          .select()
          .maybeSingle()
        if (!error && data) setSession(data as SoalHatiSession)
      } catch {
        // Best-effort — jangan sekat pengalaman user jika simpan progress gagal.
      }
    },
    [user, babId]
  )

  return { session, loading, saveProgress }
}
