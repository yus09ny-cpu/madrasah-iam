// Vercel Edge Function — senarai semua pengguna untuk Admin Panel.
// Guna SUPABASE_SERVICE_ROLE_KEY untuk bypass RLS dan query auth.users + profiles.
// Hanya boleh diakses oleh master_admin atau super_admin.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

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
    return new Response('Supabase belum dikonfigurasi', { status: 500 })
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Sahkan JWT dan dapatkan user semasa
  const { data: { user }, error: userErr } = await adminClient.auth.getUser(jwt)
  if (userErr || !user) return new Response('Token tidak sah', { status: 401 })

  // Semak sama ada pengguna adalah admin
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const adminRoles = ['master_admin', 'super_admin']
  if (!callerProfile || !adminRoles.includes(callerProfile.role ?? '')) {
    return new Response('Akses ditolak', { status: 403 })
  }

  // Ambil semua profiles (service role — bypass RLS)
  const { data: profiles, error: profilesErr } = await adminClient
    .from('profiles')
    .select('id, name, tier, role, talqin_completed, created_at')
    .order('created_at', { ascending: false })

  if (profilesErr) return json({ error: profilesErr.message }, 500)

  // Ambil semua auth.users supaya pengguna tanpa profiles pun kelihatan
  const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authErr || !authData) {
    // Kalau gagal ambil auth users, kembalikan profiles sahaja
    return json(profiles ?? [])
  }

  // Merge: profiles ada → guna data profiles; tiada → cipta placeholder dari auth.users
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const result = authData.users.map(authUser => {
    const existing = profileMap.get(authUser.id)
    if (existing) return existing
    return {
      id: authUser.id,
      name: (authUser.user_metadata?.name as string | null) ?? authUser.email ?? null,
      tier: 'free' as const,
      role: null,
      talqin_completed: null,
      created_at: authUser.created_at,
      _no_profile: true,
    }
  })

  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return json(result)
}
