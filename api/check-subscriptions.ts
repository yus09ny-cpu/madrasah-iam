// Vercel Cron Job — semak subscription Pro/Pro Plus setiap hari.
// Jadual (vercel.json): "0 0 * * *" UTC = 8:00 AM (GMT+8).
//
// 1. Subscription tamat dalam 3 hari & belum dapat reminder hari ini -> hantar emel renew.
// 2. Subscription sudah tamat -> downgrade ke tier 'free' + emel makluman (jika boleh).

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

export const config = { runtime: 'edge' }

const RESEND_FROM = 'Madrasah I AM <noreply@madrasahiam.com>'
const RENEW_URL = 'https://madrasahiam.com/rezeki'

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

  // 1. Reminder — subscription tamat dalam 3 hari, belum dihantar reminder hari ini.
  const { data: reminderUsers, error: reminderError } = await supabase
    .from('profiles')
    .select('id, email, name, subscription_expiry, last_reminder_sent')
    .in('subscription_tier', ['pro', 'pro_plus'])
    .gt('subscription_expiry', now.toISOString())
    .lte('subscription_expiry', in3Days.toISOString())

  let remindersSent = 0
  if (reminderError) {
    console.error('[check-subscriptions] reminder query error:', reminderError.message)
  } else {
    for (const u of reminderUsers ?? []) {
      if (u.last_reminder_sent && u.last_reminder_sent.slice(0, 10) === todayStr) continue
      if (!u.email || !u.subscription_expiry) continue

      if (resendKey) {
        await sendEmail(
          resendKey,
          u.email,
          'Subscription Pro anda akan tamat',
          reminderEmailHtml(u.name ?? 'sahabat', formatTarikh(u.subscription_expiry))
        )
      }

      await supabase.from('profiles').update({ last_reminder_sent: now.toISOString() }).eq('id', u.id)
      remindersSent++
    }
  }

  // 2. Downgrade — subscription sudah tamat.
  const { data: expiredUsers, error: expiredError } = await supabase
    .from('profiles')
    .select('id, email, name, subscription_expiry')
    .in('subscription_tier', ['pro', 'pro_plus'])
    .lt('subscription_expiry', now.toISOString())

  let downgraded = 0
  if (expiredError) {
    console.error('[check-subscriptions] expired query error:', expiredError.message)
  } else {
    for (const u of expiredUsers ?? []) {
      await supabase
        .from('profiles')
        .update({ tier: 'free', subscription_tier: 'free' })
        .eq('id', u.id)

      if (resendKey && u.email) {
        await sendEmail(resendKey, u.email, 'Subscription Pro anda telah tamat', downgradeEmailHtml(u.name ?? 'sahabat'))
      }

      downgraded++
    }
  }

  console.log(`[check-subscriptions] remindersSent=${remindersSent} downgraded=${downgraded}`)
  return json({ remindersSent, downgraded })
}
