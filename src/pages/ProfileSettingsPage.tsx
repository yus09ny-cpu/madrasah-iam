import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, User, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { AppLanguage } from '@/types'
import { getReferralTier, getNextReferralTier } from '@/config/referral'

const LANGUAGES: { value: AppLanguage; label: string; flag: string }[] = [
  { value: 'bm', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
]

const COUNTRIES: { value: string; labelKey: string }[] = [
  { value: 'Malaysia',                labelKey: 'profil.negara.malaysia' },
  { value: 'Indonesia',               labelKey: 'profil.negara.indonesia' },
  { value: 'Singapura',               labelKey: 'profil.negara.singapura' },
  { value: 'Brunei',                  labelKey: 'profil.negara.brunei' },
  { value: 'Thailand',                labelKey: 'profil.negara.thailand' },
  { value: 'Arab Saudi',              labelKey: 'profil.negara.arab_saudi' },
  { value: 'Emiriah Arab Bersatu',    labelKey: 'profil.negara.uae' },
  { value: 'United Kingdom',          labelKey: 'profil.negara.uk' },
  { value: 'Australia',               labelKey: 'profil.negara.australia' },
  { value: 'Lain-lain',               labelKey: 'profil.negara.lain' },
]

const EDU_LEVELS: { value: string; labelKey: string }[] = [
  { value: 'SPM / Setaraf',          labelKey: 'profil.edu.spm' },
  { value: 'Diploma',                 labelKey: 'profil.edu.diploma' },
  { value: 'Ijazah Sarjana Muda',     labelKey: 'profil.edu.ijazah' },
  { value: 'Sarjana',                 labelKey: 'profil.edu.sarjana' },
  { value: 'Doktor Falsafah',         labelKey: 'profil.edu.phd' },
  { value: 'Pondok / Agama',          labelKey: 'profil.edu.pondok' },
  { value: 'Lain-lain',               labelKey: 'profil.edu.lain' },
]

const RELIGIOUS_BG: { value: string; labelKey: string }[] = [
  { value: 'Muslim sejak lahir',              labelKey: 'profil.agama.sejak_lahir' },
  { value: 'Muallaf (baru memeluk Islam)',    labelKey: 'profil.agama.muallaf' },
  { value: 'Sedang mendalami agama',          labelKey: 'profil.agama.mendalami' },
  { value: 'Sudah lama belajar agama',        labelKey: 'profil.agama.lama_belajar' },
  { value: 'Lain-lain',                       labelKey: 'profil.agama.lain' },
]

type ReferralItem = {
  id: string
  referred_name: string | null
  status: 'pending' | 'active' | 'churned'
  created_at: string
  activated_at: string | null
}

function ReferralSection() {
  const { t } = useTranslation()
  const { user, setUser } = useAuthStore()
  const [code, setCode] = useState<string | null>(user?.referral_code ?? null)
  const [referrals, setReferrals] = useState<ReferralItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setLoading(false)
        return
      }

      let currentCode = code
      if (!currentCode) {
        try {
          const res = await fetch('/api/referral/ensure-code', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await res.json()
          if (res.ok && data.referral_code) {
            currentCode = data.referral_code
            if (!cancelled) {
              setCode(currentCode)
              if (user) setUser({ ...user, referral_code: currentCode })
            }
          }
        } catch {
          /* ignore — papar tanpa kod, cuba lagi bila reload */
        }
      }

      try {
        const res = await fetch('/api/referral/list', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!cancelled && res.ok && Array.isArray(data)) setReferrals(data)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCount = referrals.filter(r => r.status === 'active').length
  const currentTier = getReferralTier(activeCount)
  const nextTier = getNextReferralTier(activeCount)
  const link = code ? `${import.meta.env.VITE_APP_URL || window.location.origin}/join?ref=${code}` : ''

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-[#e8dcc8] font-semibold text-sm">{t('rujukan.tajuk')}</p>
        <p className="text-[#8a7a65] text-xs mt-0.5">{t('rujukan.sub')}</p>
      </div>

      {loading ? (
        <p className="text-[#8a7a65] text-xs">{t('rujukan.memuatkan')}</p>
      ) : !code ? (
        <p className="text-[#8a7a65] text-xs">{t('rujukan.hanya_pro')}</p>
      ) : (
        <>
          {/* Kod + pautan */}
          <div className="space-y-2">
            <label className="text-[#8a7a65] text-xs">{t('rujukan.kod_rujukan')}</label>
            <div className="flex items-center gap-2 px-4 py-3 bg-[#060d16] border border-[#1e2d40] rounded-xl">
              <span className="text-[#c9a96e] font-mono text-sm flex-1">{code}</span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[#1e2d40] hover:border-[#c9a96e30] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-sm flex-shrink-0">🔗</span>
              <span className="text-[#8a7a65] text-xs truncate">{t('rujukan.pautan')}</span>
            </div>
            <span className={cn('text-xs flex-shrink-0 ml-2', copied ? 'text-emerald-400' : 'text-[#c9a96e]')}>
              {copied ? `✓ ${t('rujukan.salin_done')}` : t('rujukan.salin')}
            </span>
          </button>

          {/* Progress */}
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[#8a7a65] text-[10px] uppercase tracking-widest">{t('rujukan.rujukan_aktif')}</p>
              <p className="text-[#e8dcc8] text-lg font-semibold">{activeCount}</p>
            </div>
            <div className="text-right">
              <p className="text-[#8a7a65] text-[10px] uppercase tracking-widest">{t('rujukan.tahap_semasa')}</p>
              <p className="text-[#c9a96e] text-sm font-medium">
                {currentTier ? t(currentTier.labelKey as any) : t('rujukan.tiada_tahap')}
              </p>
            </div>
          </div>
          {nextTier && (
            <p className="text-[#8a7a65] text-[11px] text-center">
              {t('rujukan.lagi_untuk', { count: nextTier.minActive - activeCount })} {t(nextTier.labelKey as any)}
            </p>
          )}

          {/* Senarai rujukan */}
          <div className="space-y-2 pt-2">
            <p className="text-[#8a7a65] text-[10px] uppercase tracking-widest px-1">{t('rujukan.senarai_tajuk')}</p>
            {referrals.length === 0 ? (
              <p className="text-[#8a7a65] text-xs px-1">{t('rujukan.senarai_kosong')}</p>
            ) : (
              <div className="space-y-1.5">
                {referrals.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-[#1e2d40] text-sm">
                    <span className="text-[#e8dcc8] truncate">{r.referred_name ?? '—'}</span>
                    <span className={cn(
                      'text-xs flex-shrink-0 ml-2',
                      r.status === 'active' ? 'text-emerald-400' : r.status === 'churned' ? 'text-[#8a7a65]' : 'text-[#c9a96e]'
                    )}>
                      {t(`rujukan.status.${r.status}` as any)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function ProfileSettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()

  const [form, setForm] = useState({
    name: user?.name ?? '',
    nickname: user?.nickname ?? '',
    age: user?.age?.toString() ?? '',
    country: user?.country ?? '',
    state: user?.state ?? '',
    education_level: user?.education_level ?? '',
    religious_background: user?.religious_background ?? '',
    language: user?.language ?? 'bm',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const updates = {
        name: form.name.trim() || null,
        nickname: form.nickname.trim() || null,
        age: form.age ? parseInt(form.age) : null,
        country: form.country || null,
        state: form.state.trim() || null,
        education_level: form.education_level || null,
        religious_background: form.religious_background || null,
        language: form.language as AppLanguage,
        updated_at: new Date().toISOString(),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('profiles') as any)
        .update(updates)
        .eq('id', user.id)
      if (err) throw err
      setUser({ ...user, ...updates })
      setSaved(true)
    } catch (e: unknown) {
      setError((e as Error)?.message ?? t('profil.ralat_simpan'))
    } finally {
      setSaving(false)
    }
  }

  const tierLabel = user?.tier === 'pro' ? '✦ Pro' : user?.tier === 'family' ? `✦ ${t('iam.keluarga')}` : t('iam.percuma')
  const initial = (user?.nickname ?? user?.name ?? 'U').charAt(0).toUpperCase()

  return (
    <div className="p-5 md:p-8 max-w-lg mx-auto space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#c9a96e30] border border-[#c9a96e40] flex items-center justify-center text-[#c9a96e] text-2xl font-serif font-bold">
          {initial}
        </div>
        <div>
          <h1 className="text-[#e8dcc8] font-semibold text-lg">{user?.nickname ?? user?.name ?? t('profil.fallback_nama')}</h1>
          <p className="text-[#8a7a65] text-xs">{user?.email}</p>
          <span className="text-xs text-[#c9a96e]">{tierLabel}</span>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-[#8a7a65] text-xs">{t('profil.nama_penuh')}</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder={t('profil.nama_ph')}
            className="w-full px-4 py-3 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none focus:border-[#c9a96e40] placeholder:text-[#8a7a65]"
          />
        </div>

        {/* Nickname */}
        <div className="space-y-1.5">
          <label className="text-[#8a7a65] text-xs">{t('profil.nama_panggilan')} <span className="text-[#c9a96e60]">{t('profil.nama_panggilan_sub')}</span></label>
          <input
            value={form.nickname}
            onChange={e => set('nickname', e.target.value)}
            placeholder={t('profil.panggilan_ph')}
            className="w-full px-4 py-3 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none focus:border-[#c9a96e40] placeholder:text-[#8a7a65]"
          />
        </div>

        {/* Age + Country row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[#8a7a65] text-xs">{t('profil.umur')}</label>
            <input
              type="number"
              min={1}
              max={120}
              value={form.age}
              onChange={e => set('age', e.target.value)}
              placeholder="—"
              className="w-full px-4 py-3 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none focus:border-[#c9a96e40] placeholder:text-[#8a7a65]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[#8a7a65] text-xs">{t('profil.negara_label')}</label>
            <select
              value={form.country}
              onChange={e => set('country', e.target.value)}
              className="w-full px-4 py-3 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none"
            >
              <option value="">{t('profil.negara_pilih')}</option>
              {COUNTRIES.map(c => <option key={c.value} value={c.value}>{t(c.labelKey as any)}</option>)}
            </select>
          </div>
        </div>

        {/* State */}
        <div className="space-y-1.5">
          <label className="text-[#8a7a65] text-xs">{t('profil.negeri')}</label>
          <input
            value={form.state}
            onChange={e => set('state', e.target.value)}
            placeholder={t('profil.negeri_ph')}
            className="w-full px-4 py-3 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none focus:border-[#c9a96e40] placeholder:text-[#8a7a65]"
          />
        </div>

        {/* Education */}
        <div className="space-y-1.5">
          <label className="text-[#8a7a65] text-xs">{t('profil.tahap_pendidikan')}</label>
          <select
            value={form.education_level}
            onChange={e => set('education_level', e.target.value)}
            className="w-full px-4 py-3 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none"
          >
            <option value="">{t('profil.tahap_pilih')}</option>
            {EDU_LEVELS.map(l => <option key={l.value} value={l.value}>{t(l.labelKey as any)}</option>)}
          </select>
        </div>

        {/* Religious background */}
        <div className="space-y-1.5">
          <label className="text-[#8a7a65] text-xs">{t('profil.latar_agama')}</label>
          <select
            value={form.religious_background}
            onChange={e => set('religious_background', e.target.value)}
            className="w-full px-4 py-3 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none"
          >
            <option value="">{t('profil.latar_pilih')}</option>
            {RELIGIOUS_BG.map(r => <option key={r.value} value={r.value}>{t(r.labelKey as any)}</option>)}
          </select>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="text-[#8a7a65] text-xs">{t('profil.bahasa_ui')}</label>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.value}
                onClick={() => set('language', lang.value)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-all',
                  form.language === lang.value
                    ? 'bg-[#c9a96e20] border-[#c9a96e40] text-[#c9a96e]'
                    : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                )}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'w-full py-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50',
            saved
              ? 'bg-emerald-600 text-white'
              : 'text-[#060d16]'
          )}
          style={!saved ? { background: 'linear-gradient(135deg, #c9a96e, #a07840)' } : {}}
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> {t('profil.menyimpan')}</>
          ) : saved ? (
            <><CheckCircle2 size={16} /> {t('profil.tersimpan')}</>
          ) : (
            <><User size={16} /> {t('profil.simpan')}</>
          )}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors"
        >
          ← {t('umum.kembali')}
        </button>
      </div>

      {/* Program rujukan — hanya untuk pelanggan Pro/Pro Plus */}
      {user?.tier === 'pro' && <ReferralSection />}

      {/* Admin section — only for master_admin / super_admin / wakil_talkin */}
      {(user?.role === 'master_admin' || user?.role === 'super_admin' || user?.role === 'wakil_talkin') && (
        <div className="space-y-2 pt-2">
          <p className="text-[#8a7a65] text-[10px] uppercase tracking-widest px-1">Pentadbir</p>
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] hover:text-[#c9a96e] hover:border-[#c9a96e30] hover:bg-[#c9a96e08] transition-all text-sm"
          >
            <Shield size={16} className="text-[#c9a96e]" />
            <span>Panel Admin</span>
            <span className="ml-auto text-[#8a7a65] text-xs">→</span>
          </button>
        </div>
      )}
    </div>
  )
}
