// Vercel Cron Job — semak subscription Pro/Pro Plus setiap hari.
// Jadual (vercel.json): "0 0 * * *" UTC = 8:00 AM (GMT+8).
//
// 1. Subscription tamat dalam 3 hari & belum dapat reminder hari ini -> hantar emel renew.
// 2. Subscription sudah tamat -> downgrade ke tier 'free' + emel makluman (jika boleh).

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'
import { APP_URL } from './_config'
import { getReferralTier } from '../src/config/referral'

export const config = { runtime: 'edge' }

const RESEND_FROM = 'Madrasah I AM <noreply@madrasahiam.com>'
const RENEW_URL = `${APP_URL}/rezeki`

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function formatTarikh(iso: string) {
  return new Date(iso).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

function reminderEmailHtml(nama: string, tarikh: string) {
  return `
    <div style="font-family: Georgia, serif; background:#060d16; color:#e8dcc8; padding:32px; border-radius:16px; max-width:480px; margin:auto;">
      <h2 style="color:#c9a96e; margin-top:0;">Assalamualaikum ${nama},</h2>
      <p>Subscription Pro anda di <strong>Madrasah I AM</strong> akan tamat pada <strong>${tarikh}</strong>.</p>
      <p>Renew sekarang untuk terus menikmati akses penuh Pintu Rezeki dan ciri-ciri Pro lain.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${RENEW_URL}" style="background:#c9a96e; color:#060d16; padding:12px 28px; border-radius:12px; text-decoration:none; font-weight:bold;">Renew Sekarang</a>
      </p>
      <p style="font-size:13px; color:#8a7a65;">Terima kasih kerana menyokong Madrasah I AM.</p>
    </div>
  `
}

function downgradeEmailHtml(nama: string) {
  return `
    <div style="font-family: Georgia, serif; background:#060d16; color:#e8dcc8; padding:32px; border-radius:16px; max-width:480px; margin:auto;">
      <h2 style="color:#c9a96e; margin-top:0;">Assalamualaikum ${nama},</h2>
      <p>Subscription Pro anda di <strong>Madrasah I AM</strong> telah tamat tempoh dan akaun anda kini di tier <strong>Free</strong>.</p>
      <p>Anda boleh upgrade semula pada bila-bila masa untuk mendapatkan semula akses penuh.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${RENEW_URL}" style="background:#c9a96e; color:#060d16; padding:12px 28px; border-radius:12px; text-decoration:none; font-weight:bold;">Upgrade Semula</a>
      </p>
      <p style="font-size:13px; color:#8a7a65;">Terima kasih kerana menggunakan Madrasah I AM.</p>
    </div>
  `
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  }).catch((err) => console.error('[check-subscriptions] Resend error:', err))
}

export default async function handler(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Supabase belum dikonfigurasi' }, 500)
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey)
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 'email' bukan lajur dalam jadual 'profiles' — ia datang dari auth.users,
  // jadi ambil melalui Admin API ikut id bila perlu.
  async function getEmail(userId: string): Promise<string | null> {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) return null
    return data.user.email
  }

  async function countActiveReferrals(referrerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referrerId)
      .eq('status', 'active')
    if (error) {
      console.error('[check-subscriptions] countActiveReferrals error:', error.message)
      return 0
    }
    return count ?? 0
  }

  // 0. Diskaun 100% (>=10 rujukan aktif) — langkau ToyyibPay sepenuhnya, sambung terus
  // subscription_expiry untuk sesiapa yang akan/sudah tamat tempoh minggu ni. Bypass ni
  // sengaja dihadkan kepada set yang sama dengan reminder/downgrade (bukan setiap hari
  // untuk semua referrer) — elak lanjutkan expiry berulang-ulang setiap kali cron jalan.
  const { data: renewalCandidates, error: renewalError } = await supabase
    .from('profiles')
    .select('id, name, subscription_expiry')
    .in('subscription_tier', ['pro', 'pro_plus'])
    .not('subscription_expiry', 'is', null)
    .lte('subscription_expiry', in3Days.toISOString())

  const freeTierExtendedIds = new Set<string>()
  if (renewalError) {
    console.error('[check-subscriptions] renewal-candidate query error:', renewalError.message)
  } else {
    for (const u of renewalCandidates ?? []) {
      if (!u.subscription_expiry) continue
      const activeCount = await countActiveReferrals(u.id)
      const tier = getReferralTier(activeCount)
      if (tier?.discountPct === 100) {
        const newExpiry = new Date(new Date(u.subscription_expiry).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        const { error: extendError } = await supabase
          .from('profiles')
          .update({ subscription_expiry: newExpiry })
          .eq('id', u.id)
        if (extendError) {
          console.error(`[check-subscriptions] gagal lanjutkan free-tier untuk ${u.id}:`, extendError.message)
        } else {
          freeTierExtendedIds.add(u.id)
          console.log(`[check-subscriptions] free-tier auto-extend: user=${u.id} activeReferrals=${activeCount} newExpiry=${newExpiry}`)
        }
      }
    }
  }

  // 1. Reminder — subscription tamat dalam 3 hari, belum dihantar reminder hari ini.
  const { data: reminderUsers, error: reminderError } = await supabase
    .from('profiles')
    .select('id, name, subscription_expiry, last_reminder_sent')
    .in('subscription_tier', ['pro', 'pro_plus'])
    .gt('subscription_expiry', now.toISOString())
    .lte('subscription_expiry', in3Days.toISOString())

  let remindersSent = 0
  if (reminderError) {
    console.error('[check-subscriptions] reminder query error:', reminderError.message)
  } else {
    for (const u of reminderUsers ?? []) {
      if (freeTierExtendedIds.has(u.id)) continue
      if (u.last_reminder_sent && u.last_reminder_sent.slice(0, 10) === todayStr) continue
      if (!u.subscription_expiry) continue

      if (resendKey) {
        const email = await getEmail(u.id)
        if (email) {
          await sendEmail(
            resendKey,
            email,
            'Subscription Pro anda akan tamat',
            reminderEmailHtml(u.name ?? 'sahabat', formatTarikh(u.subscription_expiry))
          )
        }
      }

      await supabase.from('profiles').update({ last_reminder_sent: now.toISOString() }).eq('id', u.id)
      remindersSent++
    }
  }

  // 2. Downgrade — subscription sudah tamat.
  // Akaun dengan subscription_expiry = NULL (Pro/Admin kekal, tiada tarikh tamat)
  // TIDAK BOLEH downgrade — `.not('subscription_expiry', 'is', null)` pastikan ini.
  const { data: expiredUsers, error: expiredError } = await supabase
    .from('profiles')
    .select('id, name, subscription_expiry')
    .in('subscription_tier', ['pro', 'pro_plus'])
    .not('subscription_expiry', 'is', null)
    .lt('subscription_expiry', now.toISOString())

  let downgraded = 0
  if (expiredError) {
    console.error('[check-subscriptions] expired query error:', expiredError.message)
  } else {
    for (const u of expiredUsers ?? []) {
      if (freeTierExtendedIds.has(u.id)) continue
      if (!u.subscription_expiry) continue

      await supabase
        .from('profiles')
        .update({ tier: 'free', subscription_tier: 'free' })
        .eq('id', u.id)

      // Kalau user yang tamat tempoh ni sendiri seorang "referred" (dirujuk orang lain),
      // rujukan tu jadi 'churned' — kiraan aktif referrer akan turun secara automatik.
      const { error: churnError } = await supabase
        .from('referrals')
        .update({ status: 'churned' })
        .eq('referred_id', u.id)
        .eq('status', 'active')
      if (churnError) {
        console.error(`[check-subscriptions] gagal churn referral untuk ${u.id}:`, churnError.message)
      }

      if (resendKey) {
        const email = await getEmail(u.id)
        if (email) {
          await sendEmail(resendKey, email, 'Subscription Pro anda telah tamat', downgradeEmailHtml(u.name ?? 'sahabat'))
        }
      }

      downgraded++
    }
  }

  console.log(`[check-subscriptions] remindersSent=${remindersSent} downgraded=${downgraded}`)
  return json({ remindersSent, downgraded })
}
