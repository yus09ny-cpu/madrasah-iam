// Log penggunaan Anthropic API ke jadual `api_usage_logs` — dipanggil
// selepas setiap respons berjaya dari sendIAMMessage(). Kos dianggar
// mengikut kadar harga semasa untuk Haiku & Sonnet.

import { supabase } from './supabase'
import { useAuthStore } from '@/store/authStore'

const PRICING: Record<'haiku' | 'sonnet', { input: number; output: number }> = {
  haiku: { input: 0.00000025, output: 0.00000125 },
  sonnet: { input: 0.000003, output: 0.000015 },
}

function resolvePricing(model: string) {
  return model.includes('haiku') ? PRICING.haiku : PRICING.sonnet
}

export async function logApiUsage(
  feature: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return

  const pricing = resolvePricing(model)
  const cost_usd = inputTokens * pricing.input + outputTokens * pricing.output

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('api_usage_logs') as any).insert({
    user_id: user.id,
    user_type: user.tier,
    feature,
    tokens_used: inputTokens + outputTokens,
    model,
    cost_usd,
  })

  if (error) {
    console.error('[api-logger] Gagal log penggunaan API:', error)
  }
}
