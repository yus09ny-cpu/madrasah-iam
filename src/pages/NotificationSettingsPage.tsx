import { useState, useEffect } from 'react'
import { Bell, Loader2, CheckCircle2, Type } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { AppLanguage } from '@/types'

const RUMI_KEY = 'madrasah_show_rumi'
export function useRumiMode() {
  const [showRumi, setShowRumi] = useState(() => localStorage.getItem(RUMI_KEY) === 'true')
  function toggle() {
    setShowRumi(prev => {
      const next = !prev
      localStorage.setItem(RUMI_KEY, String(next))
      window.dispatchEvent(new Event('rumi-mode-change'))
      return next
    })
  }
  useEffect(() => {
    function sync() { setShowRumi(localStorage.getItem(RUMI_KEY) === 'true') }
    window.addEventListener('rumi-mode-change', sync)
    return () => window.removeEventListener('rumi-mode-change', sync)
  }, [])
  return { showRumi, toggle }
}

const NOTIF_ITEMS = [
  {
    key: 'notif_solat' as const,
    icon: '🕌',
    label: 'Waktu Solat',
    desc: 'Notifikasi 15 minit sebelum dan tepat waktu solat masuk',
    example: '"🌅 Subuh dalam 15 minit. Sediakan diri anda."',
  },
  {
    key: 'notif_malam' as const,
    icon: '🌙',
    label: 'Audit Jiwa Malam',
    desc: 'Peringatan lembut untuk audit jiwa sebelum tidur',
    example: '"Hari ini sudah hampir berlalu. Ambil 2 minit untuk audit jiwa anda."',
    hasTime: true,
  },
  {
    key: 'notif_pagi' as const,
    icon: '🌅',
    label: 'Motivasi Pagi',
    desc: 'Peringatan rohani selepas Subuh untuk mulakan hari',
    example: '"Setiap hari adalah peluang baru dari Allah. Mulakan dengan Bismillah."',
  },
  {
    key: 'notif_zikir' as const,
    icon: '📿',
    label: 'Peringatan Zikir',
    desc: 'Peringatan zikir petang selepas Asar',
    example: '"أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ — Hati yang tenang menunggu anda."',
  },
  {
    key: 'notif_reminder' as const,
    icon: '🌙',
    label: 'Peringatan Kembali',
    desc: 'Notifikasi lembut jika 2 hari tidak buka app',
    example: '"Kami rindukan kehadiran anda. Kembali bila bersedia. 🌙"',
  },
]

interface NotifPrefs {
  notif_solat: boolean
  notif_malam: boolean
  notif_malam_time: string
  notif_pagi: boolean
  notif_zikir: boolean
  notif_reminder: boolean
}

const DEFAULTS: NotifPrefs = {
  notif_solat: true,
  notif_malam: true,
  notif_malam_time: '22:00',
  notif_pagi: true,
  notif_zikir: true,
  notif_reminder: true,
}

const LANGUAGES = [
  { code: 'bm', flag: '🇲🇾', label: 'Bahasa Melayu' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'id', flag: '🇮🇩', label: 'Bahasa Indonesia' },
]

export default function NotificationSettingsPage() {
  const { user, setUser } = useAuthStore()
  const { i18n, t } = useTranslation()
  const { showRumi, toggle: toggleRumi } = useRumiMode()
  const [currentLang, setCurrentLang] = useState(i18n.language || 'bm')

  function handleLanguageChange(lang: string) {
    setCurrentLang(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('madrasah_language', lang)
    if (user) {
      setUser({ ...user, language: lang as AppLanguage })
      // Update Supabase in background — tanpa await supaya tak hang
      const raw = localStorage.getItem('madrasah-iam-auth')
      const stored = raw ? JSON.parse(raw) : null
      const accessToken = stored?.access_token
      if (accessToken) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          signal: AbortSignal.timeout(5000),
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ language: lang }),
        }).catch(() => {})
      }
    }
  }
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission)
    } else {
      setNotifPermission('unsupported')
    }
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const u = user as unknown as NotifPrefs & { id: string }
    setPrefs({
      notif_solat: u.notif_solat ?? true,
      notif_malam: u.notif_malam ?? true,
      notif_malam_time: u.notif_malam_time ?? '22:00',
      notif_pagi: u.notif_pagi ?? true,
      notif_zikir: u.notif_zikir ?? true,
      notif_reminder: u.notif_reminder ?? true,
    })
    setLoading(false)
  }, [user?.id])

  async function requestPermission() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') {
      new Notification('✦ Madrasah I AM', {
        body: 'Notifikasi berjaya diaktifkan. Alhamdulillah.',
        icon: '/favicon.svg',
      })
    }
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const raw = localStorage.getItem('madrasah-iam-auth')
      const stored = raw ? JSON.parse(raw) : null
      const accessToken = stored?.access_token
      if (accessToken) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          signal: AbortSignal.timeout(8000),
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(prefs),
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ }
    setSaving(false)
  }

  function toggle(key: keyof Pick<NotifPrefs, 'notif_solat' | 'notif_malam' | 'notif_pagi' | 'notif_zikir' | 'notif_reminder'>) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) return null

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-8">
      <div>
        <p className="font-serif text-3xl text-[#c9a96e] leading-none">الإِعْدَادَات</p>
        <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('tetapan.tajuk')}</h1>
        <p className="text-[#8a7a65] text-sm mt-0.5">{t('tetapan.sub')}</p>
      </div>

      {/* Notifikasi sub-heading */}
      <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider px-1">{t('tetapan.notif_tajuk', 'Peringatan Rohani')}</p>

      {/* Permission status */}
      <div className={cn('rounded-2xl p-4 border space-y-3',
        notifPermission === 'granted' ? 'bg-emerald-900/10 border-emerald-500/20' :
        notifPermission === 'denied' ? 'bg-red-900/10 border-red-500/20' :
        'bg-[#0d1821] border-[#1e2d40]')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className={notifPermission === 'granted' ? 'text-emerald-400' : 'text-[#8a7a65]'} />
            <div>
              <p className="text-sm font-medium text-[#e8dcc8]">{t('tetapan.notif_browser')}</p>
              <p className={cn('text-xs',
                notifPermission === 'granted' ? 'text-emerald-400' :
                notifPermission === 'denied' ? 'text-red-400' :
                'text-[#8a7a65]')}>
                {notifPermission === 'granted' ? t('tetapan.diaktifkan') :
                 notifPermission === 'denied' ? t('tetapan.dihalang') :
                 notifPermission === 'unsupported' ? 'Browser tidak menyokong' :
                 t('tetapan.belum')}
              </p>
            </div>
          </div>
          {notifPermission === 'default' && (
            <button onClick={requestPermission}
              className="px-3 py-1.5 bg-[#c9a96e] text-[#060d16] rounded-lg text-xs font-semibold hover:bg-[#e2c89a] transition-colors">
              {t('tetapan.aktifkan')}
            </button>
          )}
        </div>
        {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
          <p className="text-[#8a7a65] text-xs">Notifikasi memerlukan kebenaran browser untuk dihantar semasa app dibuka.</p>
        )}
      </div>

      {/* Notification toggles */}
      <div className="space-y-3">
        {NOTIF_ITEMS.map(item => {
          const isOn = prefs[item.key]
          return (
            <div key={item.key} className={cn('bg-[#0d1821] border rounded-2xl p-4 space-y-3 transition-all',
              isOn ? 'border-[#c9a96e30]' : 'border-[#1e2d40]')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#e8dcc8]">{item.label}</p>
                    <p className="text-xs text-[#8a7a65]">{item.desc}</p>
                  </div>
                </div>
                {/* Toggle */}
                <button onClick={() => toggle(item.key)}
                  className={cn('w-11 h-6 rounded-full relative transition-all flex-shrink-0',
                    isOn ? 'bg-[#c9a96e]' : 'bg-[#1e2d40]')}>
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                    isOn ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>

              {/* Example notification */}
              {isOn && (
                <div className="bg-[#060d16] rounded-xl p-3">
                  <p className="text-[#8a7a65] text-[10px] uppercase tracking-wider mb-1">Contoh mesej</p>
                  <p className="text-[#e8dcc8] text-xs italic">{item.example}</p>
                </div>
              )}

              {/* Time picker for malam */}
              {item.hasTime && isOn && (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[#8a7a65]">Masa:</p>
                  <input
                    type="time"
                    value={prefs.notif_malam_time}
                    onChange={e => setPrefs(prev => ({ ...prev, notif_malam_time: e.target.value }))}
                    className="bg-[#060d16] border border-[#1e2d40] rounded-lg px-3 py-1.5 text-sm text-[#e8dcc8] outline-none focus:border-[#c9a96e50]"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Haptic Mode */}
      {'vibrate' in navigator && (
        <div className="bg-[#0d1821] border border-[#a78bfa20] rounded-2xl p-4 space-y-3">
          <p className="text-[#a78bfa] text-sm font-medium">📳 Mod Tasbih — Getaran Haptik</p>
          <p className="text-[#8a7a65] text-xs leading-relaxed">
            Peringatan melalui sentuhan, bukan skrin. Seperti menyentuh tasbih di dalam poket.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Visual sahaja', sub: 'notifikasi biasa' },
              { label: 'Getaran sahaja', sub: 'mod tasbih ✦' },
              { label: 'Kedua-duanya', sub: 'visual + getaran' },
            ].map((opt, i) => (
              <button key={i} className={cn(
                'py-2.5 px-2 rounded-xl border text-center transition-all',
                i === 0 ? 'border-[#1e2d40] text-[#8a7a65]' :
                i === 1 ? 'border-[#a78bfa50] bg-[#a78bfa15] text-[#a78bfa]' :
                'border-[#1e2d40] text-[#8a7a65]'
              )}>
                <p className="text-xs font-medium">{opt.label}</p>
                <p className="text-[9px] opacity-70 mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note about notifications */}
      <div className="bg-[#060d16] border border-[#1e2d40] rounded-xl p-4">
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          <span className="text-[#c9a96e]">Nota:</span> Notifikasi aktif semasa app dibuka dalam browser. Untuk notifikasi latar belakang yang konsisten, gunakan aplikasi mobile yang akan hadir tidak lama lagi InsyaAllah.
        </p>
      </div>

      {/* ── Bahasa / Language ─────────────────────────────────────────── */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-[#e8dcc8]">{t('bahasa.tajuk')}</p>
          <p className="text-xs text-[#8a7a65] mt-0.5">{t('bahasa.sub')}</p>
        </div>
        <div className="space-y-2">
          {LANGUAGES.map(lang => {
            const isActive = currentLang === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all',
                  isActive
                    ? 'border-[#c9a96e50] bg-[#c9a96e10] text-[#c9a96e]'
                    : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.label}</span>
                </div>
                {isActive && (
                  <span className="text-xs text-[#c9a96e] font-medium">{t('bahasa.aktif')}</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          <span className="text-[#c9a96e]">✦</span> {t('bahasa.arab_kekal')}
        </p>
      </div>

      {/* ── Mod Rumi ──────────────────────────────────────────────────── */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Type size={15} className="text-[#c9a96e]" />
          <p className="text-sm font-medium text-[#e8dcc8]">{t('tetapan.rumi_tajuk', 'Mod Rumi')}</p>
        </div>
        <p className="text-xs text-[#8a7a65] leading-relaxed -mt-2">{t('tetapan.rumi_sub', 'Papar transliterasi Rumi di bawah tulisan Arab untuk bantu sebutan')}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#e8dcc8]">{t('tetapan.rumi_label', 'Tunjukkan Transliterasi Rumi')}</p>
          <button onClick={toggleRumi}
            className={cn('w-11 h-6 rounded-full relative transition-all flex-shrink-0',
              showRumi ? 'bg-[#c9a96e]' : 'bg-[#1e2d40]')}>
            <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
              showRumi ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>
        {showRumi && (
          <div className="bg-[#060d16] rounded-xl p-3 space-y-1">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">سُبْحَانَ اللَّهِ</p>
            <p className="text-[#8a7a65] text-xs italic">Subhanallah</p>
          </div>
        )}
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> :
         saved ? <><CheckCircle2 size={16} /> {t('tetapan.tersimpan')}</> :
         t('tetapan.simpan')}
      </button>
    </div>
  )
}
