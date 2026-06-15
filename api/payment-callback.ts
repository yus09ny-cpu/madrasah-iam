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
  const amount = parseFloat(form.get('amount')?.toString() ?? '0')

  if (statusId !== '1') {
    console.log(`[payment-callback] Bil ${billcode} tidak berjaya (status_id=${statusId})`)
    return new Response('OK', { status: 200 })
  }

  if (!userId) {
    return new Response('order_id tidak sah', { status: 400 })
  }

  // Pro = RM19.90, Pro Plus = RM29.90 — bezakan ikut amount yang dibayar
  const subscriptionTier = amount >= 25 ? 'pro_plus' : 'pro'
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response('Supabase belum dikonfigurasi', { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey)

  const { error } = await supabase
    .from('profiles')
    .update({
      tier: 'pro',
      subscription_tier: subscriptionTier,
      subscription_expiry: expiry,
    })
    .eq('id', userId)

  if (error) {
    console.error('[payment-callback] Supabase error:', error.message)
    return new Response('DB error', { status: 500 })
  }

  console.log(`[payment-callback] User ${userId} upgraded to ${subscriptionTier} (expiry ${expiry}), billcode=${billcode}, txn=${transactionId}`)
  return new Response('OK', { status: 200 })
}
