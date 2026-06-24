import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { AppLanguage } from '@/types'

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
    </div>
  )
}
