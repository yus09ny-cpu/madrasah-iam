// Vercel Edge Function — daftarkan hubungan rujukan selepas signup baharu.
// Guna service role sebab profiles RLS hadkan SELECT kepada baris sendiri sahaja
// (sama macam admin-users.ts) — client baharu tak boleh cari profiles.id pemilik
// kod rujukan secara terus. JWT disahkan supaya referred_id = pemanggil sebenar,
// elak sesiapa fabricate baris rujukan untuk user lain.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: { message: 'Body tidak sah' } }, 400)
  }

  const referralCode = (body?.referral_code ?? '').toString().trim()
  if (!referralCode) {
    return json({ error: { message: 'referral_code diperlukan' } }, 400)
  }

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

  const referredId = user.id

  const { data: referrer, error: referrerErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle()

  if (referrerErr) {
    console.error('[referral/register] gagal cari referrer:', referrerErr.message)
    return json({ error: { message: 'Ralat pelayan' } }, 500)
  }

  if (!referrer) {
    console.log(`[referral/register] kod rujukan tidak wujud: ${referralCode} (diabaikan senyap, tak halang signup)`)
    return json({ registered: false, reason: 'code_not_found' })
  }

  if (referrer.id === referredId) {
    console.log(`[referral/register] self-referral diabaikan: user=${referredId}`)
    return json({ registered: false, reason: 'self_referral' })
  }

  const { error: insertErr } = await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredId,
    referral_code: referralCode,
    status: 'pending',
  })

  if (insertErr) {
    // '23505' = referred_id ni dah pernah didaftar rujukan sebelum ni (unique index) — bukan ralat sebenar.
    if ((insertErr as { code?: string }).code === '23505') {
      console.log(`[referral/register] user=${referredId} sudah ada referral row sedia ada, diabaikan`)
      return json({ registered: false, reason: 'already_referred' })
    }
    console.error('[referral/register] gagal insert referrals:', insertErr.message)
    return json({ error: { message: 'Ralat pelayan' } }, 500)
  }

  console.log(`[referral/register] BERJAYA: referrer=${referrer.id} referred=${referredId} code=${referralCode}`)
  return json({ registered: true })
}
