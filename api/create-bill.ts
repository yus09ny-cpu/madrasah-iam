// Vercel Edge Function — cipta bil ToyyibPay untuk upgrade Pro/Pro Plus.
// Kunci rahsia (TOYYIBPAY_SECRET_KEY, TOYYIBPAY_CATEGORY_CODE) kekal di server.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'
import { APP_URL } from './_config'
import { getReferralTier } from '../src/config/referral'

export const config = { runtime: 'edge' }

const TOYYIBPAY_BASE = 'https://toyyibpay.com'

// Harga dalam SEN (RM x 100). Sesuaikan ikut pakej sebenar.
const PACKAGES: Record<string, { amount: number; name: string; desc: string }> = {
  pro: { amount: 1990, name: 'Madrasah I AM — Pro', desc: 'Akses Pro Madrasah I AM (30 hari)' },
  pro_plus: { amount: 2990, name: 'Madrasah I AM — Pro Plus', desc: 'Akses Pro Plus Madrasah I AM (30 hari)' },
}

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

  const secretKey = process.env.TOYYIBPAY_SECRET_KEY
  const categoryCode = process.env.TOYYIBPAY_CATEGORY_CODE
  if (!secretKey || !categoryCode) {
    return json({ error: { message: 'ToyyibPay belum dikonfigurasi' } }, 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: { message: 'Body tidak sah' } }, 400)
  }

  const { user_id, email, nama, package: pkg, phone } = body ?? {}
  if (!user_id || !email || !nama || !pkg) {
    return json({ error: { message: 'Maklumat tidak lengkap (user_id, email, nama, package diperlukan)' } }, 400)
  }

  const pkgConfig = PACKAGES[pkg]
  if (!pkgConfig) {
    return json({ error: { message: `Pakej tidak sah: ${pkg}` } }, 400)
  }

  const requestOrigin = req.headers.get('origin') ?? new URL(req.url).origin
  if (requestOrigin !== APP_URL) {
    console.warn(`[create-bill] requestOrigin (${requestOrigin}) != APP_URL (${APP_URL}) — bill tetap guna APP_URL untuk return/callback URL, bukan requestOrigin`)
  }

  // Diskaun program rujukan — dikira LIVE dari kiraan rujukan aktif semasa, bukan
  // field pending_discount_pct yang perlu disegerak/dikosongkan (elak stale state,
  // punca banyak bug session ni: coherence, used_real_rr, silent no-op writes).
  // Tahap 100% (10 rujukan aktif) tak sampai sini langsung — dibypass terus di cron.
  let billAmount = pkgConfig.amount
  let appliedDiscountPct = 0
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceKey) {
    const supabase = createClient<Database>(supabaseUrl, serviceKey)
    const { count, error: countError } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user_id)
      .eq('status', 'active')

    if (countError) {
      console.error('[create-bill] gagal kira rujukan aktif, teruskan tanpa diskaun:', countError.message)
    } else {
      const tier = getReferralTier(count ?? 0)
      if (tier) {
        appliedDiscountPct = tier.discountPct
        billAmount = Math.round(pkgConfig.amount * (1 - tier.discountPct / 100))
      }
    }
  } else {
    console.warn('[create-bill] Supabase env vars tiada — langkau pengiraan diskaun rujukan')
  }

  console.log(`[create-bill] request: user_id=${user_id} package=${pkg} baseAmount=${pkgConfig.amount} appliedDiscountPct=${appliedDiscountPct} billAmount=${billAmount} requestOrigin=${requestOrigin} appUrl=${APP_URL}`)

  const params = new URLSearchParams({
    userSecretKey: secretKey,
    categoryCode,
    billName: pkgConfig.name,
    billDescription: pkgConfig.desc,
    billPriceSetting: '1',
    billPayorInfo: '1',
    billAmount: String(billAmount),
    billReturnUrl: `${APP_URL}/payment-success`,
    billCallbackUrl: `${APP_URL}/api/payment-callback`,
    billExternalReferenceNo: `${user_id}::${pkg}`,
    billTo: nama,
    billEmail: email,
    billPhone: phone ?? '60100000000',
    billPaymentChannel: '2',
    billContentEmail: 'Terima kasih kerana upgrade Madrasah I AM. Akses anda akan diaktifkan automatik.',
    billChargeToCustomer: '1',
  })

  const upstream = await fetch(`${TOYYIBPAY_BASE}/index.php/api/createBill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await upstream.json().catch(() => null)
  const billCode = Array.isArray(data) ? data[0]?.BillCode : undefined

  if (!billCode) {
    console.error('[create-bill] Gagal cipta bil, respons ToyyibPay:', JSON.stringify(data))
    return json({ error: { message: 'Gagal mencipta bil ToyyibPay', detail: data } }, 502)
  }

  console.log(`[create-bill] bil dicipta: billCode=${billCode} callbackUrl=${APP_URL}/api/payment-callback`)
  return json({ url: `${TOYYIBPAY_BASE}/${billCode}`, billCode })
}
