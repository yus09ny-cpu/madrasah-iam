import { subDays, format } from 'date-fns'
import { supabase } from '@/lib/supabase'

const LOOKBACK_DAYS = 21 // ~3 minggu
const MIN_QUALIFYING_SESSIONS = 10
const COHERENCE_THRESHOLD = 0.70

// Cadangan lembut Mod Hamba muncul bila pengguna istiqamah DAN skor kerap
// tinggi — tanda mungkin dah mula bergantung pada angka. Coherence hanya
// wujud untuk sesi BLE sebenar (lihat ZikirKhafiPlayer's isReal contract).
export async function shouldSuggestModHamba(userId: string): Promise<boolean> {
  const cutoff = format(subDays(new Date(), LOOKBACK_DAYS), 'yyyy-MM-dd')
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('zikir_khafi_sessions') as any)
      .select('coherence')
      .eq('user_id', userId)
      .eq('session_mode', 'ble')
      .gte('session_date', cutoff)

    const sessions: { coherence: number | null }[] = data ?? []
    const qualifying = sessions.filter(s => (s.coherence ?? 0) >= COHERENCE_THRESHOLD).length
    return qualifying >= MIN_QUALIFYING_SESSIONS
  } catch {
    return false
  }
}
