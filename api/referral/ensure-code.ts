// Vercel Edge Function — pulangkan referral_code pemanggil, jana satu jika belum ada.
// Untuk backfill pelanggan Pro/Pro+ sedia ada yang upgrade sebelum ciri rujukan ni wujud
// (pelanggan baharu dapat kod secara automatik di payment-callback.ts).

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'
import { ensureReferralCode } from '../_referral'

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('authorization')
  const jwt = authHeader?.replace('Bearer ', '').trim()
  if (!jwt) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return json({ error: { message: 'Supabase belum dikonfigurasi' } }, 500)
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !user) return new Response('Token tidak sah', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, subscription_tier')
    .eq('id', user.id)
    .maybeSingle()

  const isPro = profile?.tier === 'pro' || profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'pro_plus'
  if (!isPro) {
    return json({ error: { message: 'Kod rujukan hanya untuk pelanggan Pro/Pro Plus' } }, 403)
  }

  const code = await ensureReferralCode(supabase, user.id)
  if (!code) return json({ error: { message: 'Gagal jana kod rujukan' } }, 500)

  return json({ referral_code: code })
}
