// Vercel Edge Function — senarai rujukan pemanggil sendiri sahaja (nama + status,
// TIADA maklumat kewangan). Guna service role kerana perlu baca profiles.name bagi
// user LAIN (yang dirujuk) — profiles RLS hadkan SELECT kepada baris sendiri (sama
// sebab macam admin-users.ts). Skop kepada auth.uid() = referrer_id, bukan admin-only.

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
  if (req.method !== 'GET') {
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

  const { data: referrals, error: refErr } = await supabase
    .from('referrals')
    .select('id, referred_id, status, created_at, activated_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  if (refErr) {
    console.error('[referral/list] gagal query referrals:', refErr.message)
    return json({ error: { message: 'Ralat pelayan' } }, 500)
  }

  const referredIds = (referrals ?? []).map(r => r.referred_id).filter((id): id is string => !!id)
  const namesById = new Map<string, string | null>()
  if (referredIds.length > 0) {
    const { data: referredProfiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', referredIds)
    for (const p of referredProfiles ?? []) namesById.set(p.id, p.name)
  }

  const result = (referrals ?? []).map(r => ({
    id: r.id,
    referred_name: r.referred_id ? (namesById.get(r.referred_id) ?? 'Pengguna') : null,
    status: r.status,
    created_at: r.created_at,
    activated_at: r.activated_at,
  }))

  return json(result)
}
