// Vercel Edge Function — callback dari ToyyibPay selepas pembayaran.
// ToyyibPay POST application/x-www-form-urlencoded: billcode, order_id,
// status_id (1=berjaya, 2=pending, 3=gagal), amount, transaction_id, dll.
// billExternalReferenceNo dihantar semasa createBill sebagai "userId::package"
// (lihat create-bill.ts) — pakej diambil terus dari sini, BUKAN diteka dari
// `amount` yang dibayar (diskaun rujukan boleh ubah amount, jadi teka dari
// amount akan salah klasifikasi pro/pro_plus).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'
import { ensureReferralCode } from './_referral'

export const config = { runtime: 'edge' }

type Outcome = 'updated' | 'ignored_status' | 'missing_order_id' | 'no_matching_profile' | 'db_error'

// Rekod SETIAP callback (berjaya, gagal, atau tak match) ke payment_events untuk audit —
// supaya "user bayar di ToyyibPay tapi tak upgrade" boleh disiasat dengan satu query,
// bukan cross-check manual dashboard ToyyibPay. Never throws — audit log tak boleh gagalkan callback.
async function logPaymentEvent(
  supabase: SupabaseClient<Database>,
  fields: {
    billcode?: string
    orderId: string
    statusId?: string
    amount: number
    transactionId?: string
    matchedProfileId: string | null
    subscriptionTierApplied: string | null
    outcome: Outcome
    rawForm: Record<string, string>
  }
) {
  try {
    const { error } = await supabase.from('payment_events').insert({
      billcode: fields.billcode ?? null,
      order_id: fields.orderId || null,
      status_id: fields.statusId ?? null,
      amount: fields.amount,
      transaction_id: fields.transactionId ?? null,
      matched_profile_id: fields.matchedProfileId,
      subscription_tier_applied: fields.subscriptionTierApplied,
      outcome: fields.outcome,
      raw_form: fields.rawForm,
    })
    if (error) console.error('[payment-callback] gagal simpan payment_events:', error.message)
  } catch (err) {
    console.error('[payment-callback] exception simpan payment_events:', err)
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const form = await req.formData()
  const statusId = form.get('status_id')?.toString()
  const rawOrderId = form.get('order_id')?.toString() ?? ''
  const billcode = form.get('billcode')?.toString()
  const transactionId = form.get('transaction_id')?.toString()
  const rawAmount = form.get('amount')?.toString() ?? '0'
  const amount = parseFloat(rawAmount)
  const rawForm = Object.fromEntries(form.entries()) as Record<string, string>

  // order_id = "userId::package" (baharu) — fallback ke order_id mentah + teka
  // dari amount hanya untuk bil yang sudah dicipta sebelum perubahan ni deploy.
  const [userId, encodedPkg] = rawOrderId.includes('::') ? rawOrderId.split('::') : [rawOrderId, undefined]
  const pkg = encodedPkg === 'pro' || encodedPkg === 'pro_plus' ? encodedPkg : undefined

  console.log(`[payment-callback] STEP 1 — callback diterima: billcode=${billcode} order_id=${rawOrderId} userId=${userId} pkg=${pkg ?? '(guna fallback amount)'} status_id=${statusId} amount(raw)=${rawAmount} transaction_id=${transactionId}`)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[payment-callback] STEP 2 — Supabase env vars tiada (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY), tak boleh proses atau audit callback ni')
    return new Response('Supabase belum dikonfigurasi', { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey)

  if (statusId !== '1') {
    console.log(`[payment-callback] STEP 2 — tidak diproses: status_id=${statusId} bukan '1' (1=berjaya, 2=pending, 3=gagal). Bil ${billcode} diabaikan.`)
    await logPaymentEvent(supabase, {
      billcode, orderId: rawOrderId, statusId, amount, transactionId,
      matchedProfileId: null, subscriptionTierApplied: null, outcome: 'ignored_status', rawForm,
    })
    return new Response('OK', { status: 200 })
  }

  if (!userId) {
    console.error('[payment-callback] STEP 2 — order_id kosong/tidak sah, tidak boleh kenal pasti profile untuk dikemaskini')
    await logPaymentEvent(supabase, {
      billcode, orderId: rawOrderId, statusId, amount, transactionId,
      matchedProfileId: null, subscriptionTierApplied: null, outcome: 'missing_order_id', rawForm,
    })
    return new Response('order_id tidak sah', { status: 400 })
  }

  // Pakej diambil dari order_id ("userId::package") — fallback ke teka amount
  // (>=RM25 = pro_plus) hanya untuk bil lama yang dicipta sebelum encoding ni wujud.
  const subscriptionTier = pkg ?? (amount >= 25 ? 'pro_plus' : 'pro')
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  console.log(`[payment-callback] STEP 2 — status_id=1 (berjaya). Target profile id=${userId}, subscriptionTier=${subscriptionTier} (${pkg ? 'dari order_id' : 'fallback amount=' + amount}), expiry=${expiry}`)

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({
      tier: 'pro',
      subscription_tier: subscriptionTier,
      subscription_expiry: expiry,
    })
    .eq('id', userId)
    .select('id, tier, subscription_tier, subscription_expiry')

  if (error) {
    console.error('[payment-callback] STEP 3 — Supabase update error:', error.message)
    await logPaymentEvent(supabase, {
      billcode, orderId: rawOrderId, statusId, amount, transactionId,
      matchedProfileId: null, subscriptionTierApplied: null, outcome: 'db_error', rawForm,
    })
    return new Response('DB error', { status: 500 })
  }

  if (!updated || updated.length === 0) {
    console.error(`[payment-callback] STEP 3 — TIADA profile row dikemaskini untuk id=${userId}. Kemungkinan order_id tak padan dengan mana-mana profiles.id (contoh: bil dicipta manual di dashboard ToyyibPay dengan External Reference No yang salah/kosong).`)
    await logPaymentEvent(supabase, {
      billcode, orderId: rawOrderId, statusId, amount, transactionId,
      matchedProfileId: null, subscriptionTierApplied: null, outcome: 'no_matching_profile', rawForm,
    })
    return new Response('OK', { status: 200 })
  }

  console.log(`[payment-callback] STEP 3 — BERJAYA: profile dikemaskini`, JSON.stringify(updated[0]))
  await logPaymentEvent(supabase, {
    billcode, orderId: rawOrderId, statusId, amount, transactionId,
    matchedProfileId: userId, subscriptionTierApplied: subscriptionTier, outcome: 'updated', rawForm,
  })

  // Program rujukan: (a) jana referral_code untuk pelanggan Pro/Pro+ kali pertama,
  // (b) kalau user ni sendiri dirujuk oleh orang lain, aktifkan rujukan tu sekarang.
  const referralCode = await ensureReferralCode(supabase, userId)
  console.log(`[payment-callback] STEP 4 — referral_code untuk ${userId}: ${referralCode ?? '(gagal jana)'}`)

  const { data: activatedReferral, error: referralError } = await supabase
    .from('referrals')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('referred_id', userId)
    .in('status', ['pending', 'churned'])
    .select('id, referrer_id, status')

  if (referralError) {
    console.error('[payment-callback] STEP 4 — gagal aktifkan referral row:', referralError.message)
  } else if (activatedReferral && activatedReferral.length > 0) {
    console.log(`[payment-callback] STEP 4 — referral diaktifkan: referred=${userId} referrer=${activatedReferral[0].referrer_id}`)
  }

  console.log(`[payment-callback] STEP 5 — selesai: User ${userId} upgraded to ${subscriptionTier} (expiry ${expiry}), billcode=${billcode}, txn=${transactionId}`)
  return new Response('OK', { status: 200 })
}
