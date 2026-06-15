// Vercel Edge Function — cipta bil ToyyibPay untuk upgrade Pro/Pro Plus.
// Kunci rahsia (TOYYIBPAY_SECRET_KEY, TOYYIBPAY_CATEGORY_CODE) kekal di server.

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

  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  const params = new URLSearchParams({
    userSecretKey: secretKey,
    categoryCode,
    billName: pkgConfig.name,
    billDescription: pkgConfig.desc,
    billPriceSetting: '1',
    billPayorInfo: '1',
    billAmount: String(pkgConfig.amount),
    billReturnUrl: `${origin}/payment-success`,
    billCallbackUrl: `${origin}/api/payment-callback`,
    billExternalReferenceNo: user_id,
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
    return json({ error: { message: 'Gagal mencipta bil ToyyibPay', detail: data } }, 502)
  }

  return json({ url: `${TOYYIBPAY_BASE}/${billCode}`, billCode })
}
