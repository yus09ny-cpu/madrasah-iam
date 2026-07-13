// Kongsi antara Vercel Functions dalam api/ — fail berawalan `_` tidak jadi route.
// Helper penjanaan referral_code, guna service-role client (caller kena sediakan).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'
import { REFERRAL_CODE_PREFIX } from '../src/config/referral'

// Abjad tanpa aksara mudah keliru (0/O, 1/I/L) — kod kekal mudah dibaca/ditaip semula.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 5
const MAX_ATTEMPTS = 5

function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return `${REFERRAL_CODE_PREFIX}${code}`
}

// Pulangkan referral_code sedia ada, atau jana + simpan satu baharu jika belum ada.
// Retry pada unique-constraint collision (jarang berlaku — 5 aksara dari 32-abjad ~33M kombinasi)
// guna constraint DB sebagai race-safety net, bukan SELECT-then-INSERT check.
export async function ensureReferralCode(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle()

  if (existing?.referral_code) return existing.referral_code

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateReferralCode()
    const { data, error } = await supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', userId)
      .is('referral_code', null)
      .select('referral_code')
      .maybeSingle()

    if (!error && data?.referral_code) return data.referral_code
    // '23505' = unique collision — cuba semula dengan kod baharu
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[_referral] ensureReferralCode error:', error.message)
      return null
    }
  }

  console.error(`[_referral] ensureReferralCode gagal selepas ${MAX_ATTEMPTS} percubaan untuk user=${userId}`)
  return null
}
