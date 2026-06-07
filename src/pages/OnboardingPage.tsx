import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { User, AppLanguage } from '@/types'

// ─── Data ──────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'Malaysia', 'Singapura', 'Brunei', 'Indonesia', 'Thailand',
  'United Kingdom', 'Australia', 'United States', 'Kanada',
  'Jepun', 'Korea Selatan', 'Mesir', 'Arab Saudi', 'Turki',
  'Pakistan', 'India', 'Bangladesh', 'Emiriah Arab Bersatu',
  'Qatar', 'Netherlands (Belanda)', 'Perancis', 'Lain-lain',
]

const MALAYSIA_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu',
  'Kuala Lumpur', 'Labuan', 'Putrajaya',
]

const EDUCATION_LEVELS = [
  { id: 'menengah', label: 'Sekolah Menengah / SPM' },
  { id: 'diploma', label: 'Diploma / STPM' },
  { id: 'ijazah', label: 'Ijazah (Degree)' },
  { id: 'sarjana', label: 'Sarjana / PhD' },
  { id: 'agama', label: 'Pengajian Agama' },
  { id: 'lain', label: 'Lain-lain' },
]

const RELIGIOUS_BACKGROUNDS = [
  { id: 'sekolah_agama', label: 'Sekolah agama / pondok', icon: '🕌' },
  { id: 'tadika_quran', label: 'Tadika Quran / KAFA', icon: '📖' },
  { id: 'belajar_sendiri', label: 'Belajar sendiri / usrah', icon: '🌟' },
  { id: 'tiada_formal', label: 'Tiada latar formal', icon: '🌱' },
  { id: 'universiti_islam', label: 'Universiti Islam', icon: '🎓' },
  { id: 'lain', label: 'Lain-lain', icon: '💫' },
]

const LANGUAGES: { value: AppLanguage; label: string; native: string; flag: string }[] = [
  { value: 'bm', label: 'Bahasa Melayu', native: 'BM', flag: '🇲🇾' },
  { value: 'en', label: 'English', native: 'EN', flag: '🇬🇧' },
  { value: 'ar', label: 'العربية', native: 'AR', flag: '🇸🇦' },
  { value: 'id', label: 'Bahasa Indonesia', native: 'ID', flag: '🇮🇩' },
]

function getPersona(age: number): { title: string; icon: string; desc: string } {
  if (age <= 18) return { title: 'Si Pencari', icon: '🌱', desc: 'Perjalanan anda baru bermula. Setiap langkah adalah hadiah.' }
  if (age <= 25) return { title: 'Si Pengembara', icon: '🌊', desc: 'Anda sedang meneroka. Biarkan ilmu membimbing jiwa.' }
  if (age <= 40) return { title: 'Si Pemikir', icon: '🏡', desc: 'Anda sedang membina. Akar yang kuat menjana buah yang manis.' }
  if (age <= 60) return { title: 'Si Perenung', icon: '🌙', desc: 'Kebijaksanaan anda adalah cahaya kepada orang sekeliling.' }
  return { title: 'Si Arif', icon: '✦', desc: 'Anda adalah warisan hidup. Ilmu anda abadi.' }
}

const TOTAL_STEPS = 7

// ─── FormData ──────────────────────────────────────────────────────────────

interface FormData {
  nickname: string
  age: string
  country: string
  state: string       // Negeri (Malaysia) atau Bandar (luar)
  education_level: string
  religious_background: string[]  // multi-select
  language: AppLanguage
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>({
    nickname: user?.name ?? '',
    age: '',
    country: 'Malaysia',
    state: '',
    education_level: '',
    religious_background: [],
    language: 'bm',
  })

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function selectLanguage(lang: AppLanguage) {
    update('language', lang)
    // Tukar bahasa serta-merta supaya pratonton UI sepadan dengan pilihan
    i18n.changeLanguage(lang)
    localStorage.setItem('madrasah_language', lang)
  }

  function toggleBackground(id: string) {
    setForm(prev => ({
      ...prev,
      religious_background: prev.religious_background.includes(id)
        ? prev.religious_background.filter(x => x !== id)
        : [...prev.religious_background, id],
    }))
  }

  const progress = (step / TOTAL_STEPS) * 100
  const age = parseInt(form.age) || 0
  const persona = age >= 10 ? getPersona(age) : null

  function canProceed() {
    switch (step) {
      case 1: return form.nickname.trim().length >= 2
      case 2: return form.age !== '' && age >= 10 && age <= 100
      case 3: return form.country !== ''
      case 4: return form.state.trim().length >= 2
      case 5: return form.education_level !== ''
      case 6: return form.religious_background.length > 0
      case 7: return true
      default: return true
    }
  }

  function nextStep() {
    if (!canProceed()) return
    if (step === TOTAL_STEPS) {
      handleFinish()
    } else {
      setStep((s) => s + 1)
    }
  }

  function prevStep() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleFinish() {
    if (!user) {
      console.error('handleFinish: no user in store, aborting')
      return
    }
    setSaving(true)
    try {
      const isMalaysia = form.country === 'Malaysia'
      const updates = {
        nickname: form.nickname.trim(),
        name: form.nickname.trim(),
        age: age || null,
        country: form.country,
        state: isMalaysia ? form.state : null,
        education_level: form.education_level,
        religious_background: form.religious_background.join('|'),
        language: form.language,
        onboarding_complete: true,
      }
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('profiles update timed out')), 8000)
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatePromise = (supabase.from('profiles') as any).update(updates).eq('id', user.id)
        const { error } = (await Promise.race([updatePromise, timeout])) as { error: unknown }
        if (error) console.error('Onboarding profile update error:', error)
      } catch (err) {
        console.error('Onboarding profile update threw:', err)
      }
      setUser({ ...user, ...updates } as User)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('handleFinish error:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    if (!user) return
    setUser({ ...user, onboarding_complete: true } as User)
    navigate('/dashboard', { replace: true })
  }

  const isMalaysia = form.country === 'Malaysia'

  return (
    <div className="min-h-screen bg-[#060d16] flex flex-col items-center justify-center p-4">
      {/* Progress */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#8a7a65] text-xs">Langkah {step} dari {TOTAL_STEPS}</p>
          <p className="text-[#c9a96e] text-xs font-medium">{Math.round(progress)}%</p>
        </div>
        <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
          <div className="h-full bg-[#c9a96e] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-7 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">{STEP_META[step]?.icon ?? '✨'}</span>
          </div>
          <p className="font-serif text-[#c9a96e] text-xs tracking-widest uppercase">{STEP_META[step]?.category}</p>
          <h2 className="font-serif text-[#e8dcc8] text-xl mt-1">{STEP_META[step]?.title}</h2>
          {STEP_META[step]?.subtitle && (
            <p className="text-[#8a7a65] text-sm mt-1">{STEP_META[step].subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="min-h-[180px]">
          {/* Step 1: Nama */}
          {step === 1 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">Nama Panggilan</label>
              <input type="text" value={form.nickname} onChange={e => update('nickname', e.target.value)}
                placeholder="Contoh: Abu, Maryam, Hafiz..." maxLength={30} autoFocus
                className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none text-sm transition-colors" />
              <p className="text-[#8a7a65] text-xs">Ini nama yang ditunjukkan sepanjang perjalanan rohani anda</p>
            </div>
          )}

          {/* Step 2: Umur + Persona */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">Umur</label>
                <input type="number" value={form.age} onChange={e => update('age', e.target.value)}
                  placeholder="25" min={10} max={100} autoFocus
                  className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none text-sm transition-colors" />
              </div>
              {persona && (
                <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl p-4 text-center">
                  <p className="text-2xl mb-1">{persona.icon}</p>
                  <p className="text-[#c9a96e] font-serif text-base">{persona.title}</p>
                  <p className="text-[#8a7a65] text-xs mt-1 leading-relaxed">{persona.desc}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Negara */}
          {step === 3 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">Negara</label>
              <select value={form.country} onChange={e => update('country', e.target.value)}
                className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-[#e8dcc8] outline-none text-sm transition-colors">
                {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#0d1821]">{c}</option>)}
              </select>
            </div>
          )}

          {/* Step 4: Negeri (Malaysia) atau Bandar (luar) */}
          {step === 4 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">
                {isMalaysia ? 'Negeri' : 'Bandar / Wilayah'}
              </label>
              {isMalaysia ? (
                <select value={form.state} onChange={e => update('state', e.target.value)}
                  className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-[#e8dcc8] outline-none text-sm transition-colors">
                  <option value="" className="bg-[#0d1821]">-- Pilih Negeri --</option>
                  {MALAYSIA_STATES.map(s => <option key={s} value={s} className="bg-[#0d1821]">{s}</option>)}
                </select>
              ) : (
                <input type="text" value={form.state} onChange={e => update('state', e.target.value)}
                  placeholder={`Contoh: London, Sydney, Dubai...`}
                  className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none text-sm transition-colors" />
              )}
            </div>
          )}

          {/* Step 5: Pendidikan */}
          {step === 5 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">Tahap Pendidikan</label>
              <div className="grid grid-cols-2 gap-2">
                {EDUCATION_LEVELS.map(lvl => (
                  <button key={lvl.id} onClick={() => update('education_level', lvl.id)}
                    className={cn(
                      'py-2.5 px-3 rounded-xl border text-xs text-left transition-all',
                      form.education_level === lvl.id
                        ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]'
                        : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                    )}>
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Latar Agama (multi-select) */}
          {step === 6 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">Latar Belakang Agama</label>
                <span className="text-xs text-[#8a7a65]">Boleh pilih lebih dari satu</span>
              </div>
              <div className="space-y-2">
                {RELIGIOUS_BACKGROUNDS.map(bg => {
                  const selected = form.religious_background.includes(bg.id)
                  return (
                    <button key={bg.id} onClick={() => toggleBackground(bg.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                        selected ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                      )}>
                      <span className="text-lg flex-shrink-0">{bg.icon}</span>
                      <span className="text-sm flex-1">{bg.label}</span>
                      {selected && <Check size={14} className="flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 7: Bahasa + Persona welcome */}
          {step === 7 && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">Bahasa Pilihan</label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang.value} onClick={() => selectLanguage(lang.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all',
                      form.language === lang.value ? 'border-[#c9a96e] bg-[#c9a96e15]' : 'border-[#1e2d40] hover:border-[#2a3d55]'
                    )}>
                    <span className="text-2xl">{lang.flag}</span>
                    <p className={cn('font-medium text-xs text-center', form.language === lang.value ? 'text-[#c9a96e]' : 'text-[#e8dcc8]')}>
                      {lang.label}
                    </p>
                    {form.language === lang.value && (
                      <span className="text-[10px] text-[#c9a96e]">● Dipilih</span>
                    )}
                  </button>
                ))}
              </div>
              {persona && (
                <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl p-4 text-center space-y-1">
                  <p className="text-xl">{persona.icon}</p>
                  <p className="font-serif text-[#c9a96e]">Selamat datang, {persona.title}</p>
                  <p className="text-[#8a7a65] text-xs leading-relaxed">{persona.desc}</p>
                  <p className="font-serif text-[#c9a96e] text-xs mt-2">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button onClick={prevStep}
              className="flex items-center gap-2 px-4 py-3 border border-[#1e2d40] rounded-xl text-sm text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors">
              <ChevronLeft size={16} />
              Kembali
            </button>
          )}
          <button onClick={nextStep} disabled={!canProceed() || saving}
            className="flex-1 py-3 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl hover:bg-[#e2c89a] active:bg-[#a07840] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> :
             step === TOTAL_STEPS ? <><Check size={16} />Mulakan Perjalanan</> :
             <>Seterusnya <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>

      <button onClick={handleSkip} className="text-[#8a7a65] text-xs hover:text-[#e8dcc8] transition-colors mt-4 mx-auto">
        Langkau buat masa ini →
      </button>
    </div>
  )
}

// ─── Step Metadata ────────────────────────────────────────────────────────────

const STEP_META: Record<number, { icon: string; category: string; title: string; subtitle?: string }> = {
  1: { icon: '✋', category: 'Perkenalan', title: 'Apa nama panggilan anda?', subtitle: 'Nama ini akan digunakan sepanjang perjalanan rohani anda' },
  2: { icon: '🎂', category: 'Profil', title: 'Berapakah umur anda?' },
  3: { icon: '🌍', category: 'Lokasi', title: 'Di mana anda berada?' },
  4: { icon: '📍', category: 'Lokasi', title: 'Negeri / Bandar anda?' },
  5: { icon: '📚', category: 'Latar Belakang', title: 'Tahap pendidikan anda?' },
  6: { icon: '🕌', category: 'Rohani', title: 'Latar belakang agama anda?', subtitle: 'Membantu kami menyesuaikan kandungan rohani' },
  7: { icon: '🌐', category: 'Pilihan', title: 'Bahasa yang anda selesa?', subtitle: 'Anda boleh tukar pada bila-bila masa' },
}
