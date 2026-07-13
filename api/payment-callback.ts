// Vercel Edge Function — callback dari ToyyibPay selepas pembayaran.
// ToyyibPay POST application/x-www-form-urlencoded: billcode, order_id,
// status_id (1=berjaya, 2=pending, 3=gagal), amount, transaction_id, dll.
// billExternalReferenceNo dihantar semasa createBill sebagai user_id.
// Pakej (pro/pro_plus) ditentukan dari `amount` yang dibayar.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const form = await req.formData()
  const statusId = form.get('status_id')?.toString()
  const userId = form.get('order_id')?.toString() ?? ''
  const billcode = form.get('billcode')?.toString()
  const transactionId = form.get('transaction_id')?.toString()
  const rawAmount = form.get('amount')?.toString() ?? '0'
  const amount = parseFloat(rawAmount)

  console.log(`[payment-callback] STEP 1 — callback diterima: billcode=${billcode} order_id=${userId} status_id=${statusId} amount(raw)=${rawAmount} transaction_id=${transactionId}`)

  if (statusId !== '1') {
    console.log(`[payment-callback] STEP 2 — tidak diproses: status_id=${statusId} bukan '1' (1=berjaya, 2=pending, 3=gagal). Bil ${billcode} diabaikan.`)
    return new Response('OK', { status: 200 })
  }

  if (!userId) {
    console.error('[payment-callback] STEP 2 — order_id kosong/tidak sah, tidak boleh kenal pasti profile untuk dikemaskini')
    return new Response('order_id tidak sah', { status: 400 })
  }

  // Pro = RM19.90, Pro Plus = RM29.90 — bezakan ikut amount yang dibayar
  const subscriptionTier = amount >= 25 ? 'pro_plus' : 'pro'
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  console.log(`[payment-callback] STEP 2 — status_id=1 (berjaya). Target profile id=${userId}, subscriptionTier dikira=${subscriptionTier} (amount=${amount}), expiry=${expiry}`)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[payment-callback] STEP 3 — Supabase env vars tiada (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    return new Response('Supabase belum dikonfigurasi', { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey)

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({
      tier: 'pro',
      subscription_tier: subscriptionTier,
      subscription_expiry: expiry,
    })
    .eq('id', userId)
    .select('id, email, tier, subscription_tier, subscription_expiry')

  if (error) {
    console.error('[payment-callback] STEP 4 — Supabase update error:', error.message)
    return new Response('DB error', { status: 500 })
  }

  if (!updated || updated.length === 0) {
    console.error(`[payment-callback] STEP 4 — TIADA profile row dikemaskini untuk id=${userId}. Kemungkinan order_id tak padan dengan mana-mana profiles.id (contoh: bil dicipta manual di dashboard ToyyibPay dengan External Reference No yang salah/kosong).`)
    return new Response('OK', { status: 200 })
  }

  console.log(`[payment-callback] STEP 4 — BERJAYA: profile dikemaskini`, JSON.stringify(updated[0]))
  console.log(`[payment-callback] STEP 5 — selesai: User ${userId} upgraded to ${subscriptionTier} (expiry ${expiry}), billcode=${billcode}, txn=${transactionId}`)
  return new Response('OK', { status: 200 })
}
