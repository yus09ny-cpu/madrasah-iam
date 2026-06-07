// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrayerTimings {
  Fajr: string     // "05:43"
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
  date: string     // "YYYY-MM-DD"
  city: string
}

export interface PrayerWindow {
  prayer: 'Subuh' | 'Zohor' | 'Asar' | 'Maghrib' | 'Isyak'
  time: string     // "05:43" display time
  time12: string   // "5:43 AM"
  start: Date
  end: Date
}

export type PrayerStatus = 'active' | 'done' | 'waiting' | 'missed'

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = 'madrasah-prayer-timings-v2'
const API_BASE = 'https://api.aladhan.com/v1'
const METHOD = 3 // Muslim World League (widely used in Malaysia)

const FALLBACK_KL: Omit<PrayerTimings, 'date' | 'city'> = {
  Fajr: '05:48', Dhuhr: '13:07', Asr: '16:27', Maghrib: '19:18', Isha: '20:28',
}

// ─── Time Utilities ───────────────────────────────────────────────────────────

function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(baseDate)
  d.setHours(h, m, 0, 0)
  return d
}

export function formatTime12(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h < 12 ? 'PG' : 'PTG'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function formatCountdown(ms: number): { h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    h: String(Math.floor(total / 3600)).padStart(2, '0'),
    m: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
    s: String(total % 60).padStart(2, '0'),
  }
}

export function formatTimeUntil(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}j ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m} minit`
  return 'sebentar lagi'
}

// ─── Prayer Windows ───────────────────────────────────────────────────────────

export function getPrayerWindows(timings: PrayerTimings, forDate: Date = new Date()): PrayerWindow[] {
  const tomorrow = new Date(forDate)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const fajr    = parseTimeToDate(timings.Fajr, forDate)
  const dhuhr   = parseTimeToDate(timings.Dhuhr, forDate)
  const asr     = parseTimeToDate(timings.Asr, forDate)
  const maghrib = parseTimeToDate(timings.Maghrib, forDate)
  const isha    = parseTimeToDate(timings.Isha, forDate)
  const nextFajr = parseTimeToDate(timings.Fajr, tomorrow)

  return [
    { prayer: 'Subuh',   time: timings.Fajr,    time12: formatTime12(timings.Fajr),    start: fajr,    end: dhuhr    },
    { prayer: 'Zohor',   time: timings.Dhuhr,   time12: formatTime12(timings.Dhuhr),   start: dhuhr,   end: asr      },
    { prayer: 'Asar',    time: timings.Asr,     time12: formatTime12(timings.Asr),     start: asr,     end: maghrib  },
    { prayer: 'Maghrib', time: timings.Maghrib, time12: formatTime12(timings.Maghrib), start: maghrib, end: isha     },
    { prayer: 'Isyak',   time: timings.Isha,    time12: formatTime12(timings.Isha),    start: isha,    end: nextFajr },
  ]
}

export function getPrayerStatus(window: PrayerWindow, completed: boolean, now: Date): PrayerStatus {
  if (completed) return 'done'
  if (now >= window.start && now < window.end) return 'active'
  if (now < window.start) return 'waiting'
  return 'missed'
}

export function getCurrentWindow(windows: PrayerWindow[], now: Date): PrayerWindow | null {
  return windows.find(w => now >= w.start && now < w.end) ?? null
}

export function getNextWindow(windows: PrayerWindow[], now: Date): PrayerWindow | null {
  return windows.find(w => w.start > now) ?? null
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

export async function loadPrayerTimings(lat?: number, lng?: number): Promise<PrayerTimings> {
  const today = new Date().toISOString().slice(0, 10)

  // Check cache
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as PrayerTimings
      if (parsed.date === today) return parsed
    }
  } catch { /* ignore */ }

  // Fetch from API
  try {
    let url: string
    let city = 'Kuala Lumpur'

    if (lat !== undefined && lng !== undefined) {
      const ts = Math.floor(Date.now() / 1000)
      url = `${API_BASE}/timings/${ts}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&method=${METHOD}`
      city = 'Lokasi anda'
    } else {
      url = `${API_BASE}/timingsByCity?city=Kuala+Lumpur&country=Malaysia&method=${METHOD}`
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error('API error')
    const json = await res.json()
    const t = json?.data?.timings
    if (!t?.Fajr) throw new Error('Invalid response')

    const timings: PrayerTimings = {
      Fajr: t.Fajr.slice(0, 5),
      Dhuhr: t.Dhuhr.slice(0, 5),
      Asr: t.Asr.slice(0, 5),
      Maghrib: t.Maghrib.slice(0, 5),
      Isha: t.Isha.slice(0, 5),
      date: today,
      city,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(timings))
    return timings
  } catch {
    // Use fallback
    const fallback: PrayerTimings = { ...FALLBACK_KL, date: today, city: 'Kuala Lumpur (anggaran)' }
    return fallback
  }
}

export function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    )
  })
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

const PRAYER_EMOJI: Record<string, string> = {
  Subuh: '🌅', Zohor: '☀️', Asar: '🌤️', Maghrib: '🌆', Isyak: '🌙'
}

export function scheduleNotifications(windows: PrayerWindow[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const now = new Date()

  windows.forEach(w => {
    const emoji = PRAYER_EMOJI[w.prayer] ?? '🕌'

    // 15 min before
    const msBefore = w.start.getTime() - now.getTime() - 15 * 60 * 1000
    if (msBefore > 0) {
      setTimeout(() => {
        new Notification(`${emoji} ${w.prayer} dalam 15 minit`, {
          body: 'Sediakan diri anda. Ambil wuduk.',
          icon: '/favicon.ico',
          tag: `pre-${w.prayer}`,
        })
      }, msBefore)
    }

    // At prayer time
    const msAt = w.start.getTime() - now.getTime()
    if (msAt > 0) {
      setTimeout(() => {
        new Notification(`${emoji} Waktu ${w.prayer} telah tiba`, {
          body: 'Allahu Akbar. Jangan tunggu lama.',
          icon: '/favicon.ico',
          tag: `at-${w.prayer}`,
        })
      }, msAt)
    }
  })
}
