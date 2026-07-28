import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

type ModHambaEventType = 'suggested' | 'suggestion_accepted' | 'suggestion_dismissed' | 'activated' | 'deactivated'

// Best-effort — mod_hamba_events is a secondary audit trail, never worth
// blocking the actual toggle over (table/RLS not ready yet, network blip, etc).
async function logEvent(userId: string, eventType: ModHambaEventType, exitReason?: string | null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('mod_hamba_events') as any).insert({
      user_id: userId,
      event_type: eventType,
      exit_reason: exitReason ?? null,
    })
  } catch { /* table belum wujud — jangan halang UX togol */ }
}

export function useModHamba() {
  const { user, setUser } = useAuthStore()

  async function activate() {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any).update({ mod_hamba_active: true }).eq('id', user.id)
    setUser({ ...user, mod_hamba_active: true } as User)
    logEvent(user.id, 'activated')
  }

  // reason boleh null (pengguna langkau soalan renungan) — ini bukan gate,
  // togol tetap dinyahaktifkan tanpa mengira jawapan.
  async function deactivateWithReflection(reason: string | null) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any).update({ mod_hamba_active: false }).eq('id', user.id)
    setUser({ ...user, mod_hamba_active: false } as User)
    logEvent(user.id, 'deactivated', reason)
  }

  // Dipanggil sebaik cadangan lembut dipaparkan (bukan bila diklik) — spec:
  // "tandakan di DB SELEPAS dipaparkan", supaya ia tak pernah berulang.
  async function markSuggested() {
    if (!user || user.mod_hamba_suggested_at) return
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any).update({ mod_hamba_suggested_at: now }).eq('id', user.id)
    setUser({ ...user, mod_hamba_suggested_at: now } as User)
    logEvent(user.id, 'suggested')
  }

  function logSuggestionResponse(accepted: boolean) {
    if (!user) return
    logEvent(user.id, accepted ? 'suggestion_accepted' : 'suggestion_dismissed')
  }

  return {
    isActive: user?.mod_hamba_active === true,
    activate,
    deactivateWithReflection,
    markSuggested,
    logSuggestionResponse,
  }
}
