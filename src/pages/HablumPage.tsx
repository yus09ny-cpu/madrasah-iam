import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'

function HablumUpgradeModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [loadingPkg, setLoadingPkg] = useState<'pro' | 'pro_plus' | null>(null)
  const [error, setError] = useState('')
  async function handleUpgrade(pkg: 'pro' | 'pro_plus') {
    if (!user) return
    setError(''); setLoadingPkg(pkg)
    try {
      const res = await fetch('/api/create-bill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, email: user.email, nama: user.name ?? user.email, package: pkg }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data?.error?.message ?? t('hablum.upgrade.ralat_bil'))
      window.location.href = data.url
    } catch { setError(t('hablum.upgrade.ralat_bayar')); setLoadingPkg(null) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-medium text-sm">{t('hablum.upgrade.tajuk')}</p>
        </div>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">{t('hablum.upgrade.desc')}</p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="space-y-2">
          <button onClick={() => handleUpgrade('pro')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro' && <Loader2 size={14} className="animate-spin" />}
            {t('hablum.upgrade.pro')}
          </button>
          <button onClick={() => handleUpgrade('pro_plus')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro_plus' && <Loader2 size={14} className="animate-spin" />}
            {t('hablum.upgrade.pro_plus')}
          </button>
          <button onClick={onClose} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors disabled:opacity-60">
            {t('umum.tutup')}
          </button>
        </div>
      </div>
    </div>
  )
}
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ─── Data ─────────────────────────────────────────────────────────────────────

const MINALLAH_RENUNGAN = [
  { arabic: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا', translationKey: 'hablum.minallah.renungan.1', source: 'Ali Imran: 103' },
  { arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ وَلَذِكْرُ اللَّهِ أَكْبَرُ', translationKey: 'hablum.minallah.renungan.2', source: 'Al-Ankabut: 45' },
  { arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', translationKey: 'hablum.minallah.renungan.3', source: "Ar-Ra'd: 28" },
]

const MINALLAH_AMALAN_KEYS = [
  'hablum.minallah.amalan.1', 'hablum.minallah.amalan.2', 'hablum.minallah.amalan.3',
  'hablum.minallah.amalan.4', 'hablum.minallah.amalan.5', 'hablum.minallah.amalan.6',
] as const

const MINALLAH_SOALAN_KEYS = [
  'hablum.minallah.soalan.1', 'hablum.minallah.soalan.2', 'hablum.minallah.soalan.3',
  'hablum.minallah.soalan.4', 'hablum.minallah.soalan.5',
] as const

const MINANNAS_RENUNGAN = [
  { arabic: 'وَالَّذِينَ يَصِلُونَ مَا أَمَرَ اللَّهُ بِهِ أَن يُوصَلَ وَيَخْشَوْنَ رَبَّهُمْ', translationKey: 'hablum.minannas.renungan.1', source: "Ar-Ra'd: 21" },
  { arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', translationKey: 'hablum.minannas.renungan.2', source: 'HR Bukhari & Muslim' },
  { arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ', translationKey: 'hablum.minannas.renungan.3', source: 'Al-Maidah: 2' },
]

const MINANNAS_AMALAN_KEYS = [
  'hablum.minannas.amalan.1', 'hablum.minannas.amalan.2', 'hablum.minannas.amalan.3',
  'hablum.minannas.amalan.4', 'hablum.minannas.amalan.5', 'hablum.minannas.amalan.6',
] as const

const MINANNAS_SOALAN_KEYS = [
  'hablum.minannas.soalan.1', 'hablum.minannas.soalan.2', 'hablum.minannas.soalan.3',
  'hablum.minannas.soalan.4', 'hablum.minannas.soalan.5',
] as const

// ─── Section Component ────────────────────────────────────────────────────────

interface SectionProps {
  type: 'minallah' | 'minannas'
  renungan: { arabic: string; translationKey: string; source: string }[]
  amalan: readonly string[]
  soalan: readonly string[]
  doaArabic: string
  doaTranslationKey: string
  accentColor: string
  borderColor: string
  bgColor: string
}

function HablumSection({ type, renungan, amalan, soalan, doaArabic, doaTranslationKey, accentColor, borderColor, bgColor }: SectionProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [renunganIdx, setRenunganIdx] = useState(0)
  const [checklist, setChecklist] = useState<boolean[]>(new Array(amalan.length).fill(false))
  const [answers, setAnswers] = useState<string[]>(new Array(soalan.length).fill(''))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setRenunganIdx(i => (i + 1) % renungan.length), 6000)
    return () => clearInterval(timer)
  }, [renungan.length])

  const renunganItem = renungan[renunganIdx]
  const amalanDone = checklist.filter(Boolean).length
  const answeredCount = answers.filter(a => a.trim()).length

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const answerList = soalan.map((q, i) => ({
        question_id: type === 'minallah' ? 200 + i : 300 + i,
        question: t(q as any),
        answer: answers[i] ?? '',
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('muhasabah_entries') as any)
        .insert({ user_id: user.id, date: today, answers: answerList, mood: 3 })
    } catch { /* table not yet created */ }
    setSaved(true)
    setSaving(false)
  }

  const inputClass = "w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"

  return (
    <div className="space-y-5">

      {/* Renungan bergilir */}
      <div className="rounded-2xl p-5 text-center space-y-2 transition-all duration-700" style={{ backgroundColor: bgColor, borderColor, border: '1px solid' }}>
        <p className="font-serif text-sm leading-loose text-right" style={{ color: accentColor }} dir="rtl">
          {renunganItem.arabic}
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">"{t(renunganItem.translationKey as any)}"</p>
        <p className="text-xs opacity-60" style={{ color: accentColor }}>— {renunganItem.source}</p>
        <div className="flex justify-center gap-1.5 pt-1">
          {renungan.map((_, i) => (
            <button key={i} onClick={() => setRenunganIdx(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ backgroundColor: i === renunganIdx ? accentColor : '#1e2d40' }} />
          ))}
        </div>
      </div>

      {/* 6 Amalan Harian */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#e8dcc8]">{t('hablum.amalan_harian')}</p>
          <span className="text-xs" style={{ color: accentColor }}>{amalanDone}/{amalan.length}</span>
        </div>
        {amalan.map((key, i) => (
          <button key={i} onClick={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
            className="w-full flex items-start gap-3 text-left group">
            <div className={cn('min-w-[18px] min-h-[18px] w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all')}
              style={{ borderColor: checklist[i] ? accentColor : '#2a3d55', backgroundColor: checklist[i] ? accentColor : 'transparent' }}>
              {checklist[i] && <CheckCircle2 size={11} className="text-[#060d16]" />}
            </div>
            <p className={cn('text-sm leading-snug', checklist[i] ? 'line-through opacity-60' : 'text-[#e8dcc8]')}
              style={{ color: checklist[i] ? accentColor : undefined }}>
              {t(key as any)}
            </p>
          </button>
        ))}
      </div>

      {/* 5 Soalan Refleksi */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
        <p className="text-sm font-medium text-[#e8dcc8]">{t('hablum.refleksi_harian')} <span className="text-[#8a7a65] font-normal">({answeredCount}/{soalan.length})</span></p>
        {soalan.map((key, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-xs text-[#8a7a65]">{i + 1}. {t(key as any)}</p>
            <textarea
              value={answers[i]}
              onChange={e => setAnswers(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={t('hablum.placeholder_refleksi')}
              rows={2}
              disabled={saved}
              className={cn(inputClass, 'resize-none disabled:opacity-60 disabled:cursor-not-allowed')}
            />
          </div>
        ))}
      </div>

      {/* Doa penutup */}
      <div className="bg-[#060d16] rounded-2xl p-5 text-center space-y-2" style={{ border: `1px solid ${accentColor}20` }}>
        <p className="text-xs text-[#8a7a65] uppercase tracking-wider">{t('hablum.doa_penutup')}</p>
        <p className="font-serif text-sm leading-loose text-right" style={{ color: accentColor }} dir="rtl">
          {doaArabic}
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">{t(doaTranslationKey as any)}</p>
      </div>

      {/* Save */}
      {saved ? (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl border" style={{ borderColor: `${accentColor}30` }}>
          <CheckCircle2 size={18} style={{ color: accentColor }} />
          <p className="text-sm font-serif" style={{ color: accentColor }}>{t('hablum.tersimpan')}</p>
        </div>
      ) : (
        <button onClick={handleSave} disabled={saving || answeredCount === 0}
          className="w-full py-4 font-semibold rounded-2xl text-[#060d16] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: accentColor }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {t('hablum.simpan_refleksi')}
        </button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HablumPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isPro = user?.tier === 'pro' || user?.tier === 'family'
  const [tab, setTab] = useState<'minallah' | 'minannas'>('minallah')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-8">

      {/* Header */}
      <div>
        <p className="font-serif text-3xl text-[#c9a96e] leading-none">حَبْل</p>
        <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('hablum.tajuk_page')}</h1>
        <p className="text-[#8a7a65] text-sm mt-0.5">Ali Imran: 112</p>
      </div>

      {/* Ayat rujukan */}
      <div className="bg-[#0d1821] border border-[#c9a96e15] rounded-2xl p-4 text-center">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
          إِلَّا بِحَبْلٍ مِّنَ اللَّهِ وَحَبْلٍ مِّنَ النَّاسِ
        </p>
        <p className="text-[#8a7a65] text-xs mt-1.5 italic">
          "{t('ayat.ali_imran_112')}"
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1 gap-1">
        <button onClick={() => setTab('minallah')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
            tab === 'minallah' ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          {t('hablum.tab_minallah')}
        </button>
        <button onClick={() => !isPro ? null : setTab('minannas')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            tab === 'minannas' ? 'bg-[#f43f5e] text-white' :
            !isPro ? 'text-[#8a7a65] cursor-default' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          {!isPro && <Lock size={12} />}
          {t('hablum.tab_minannas')}
        </button>
      </div>

      {/* Content */}
      {tab === 'minallah' && (
        <>
          <HablumSection
            type="minallah"
            renungan={isPro ? MINALLAH_RENUNGAN : MINALLAH_RENUNGAN.slice(0, 1)}
            amalan={isPro ? MINALLAH_AMALAN_KEYS : MINALLAH_AMALAN_KEYS.slice(0, 3)}
            soalan={isPro ? MINALLAH_SOALAN_KEYS : MINALLAH_SOALAN_KEYS.slice(0, 2)}
            doaArabic="رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"
            doaTranslationKey="hablum.minallah.doa_trans"
            accentColor="#c9a96e"
            borderColor="#c9a96e25"
            bgColor="#c9a96e08"
          />
          {!isPro && (
            <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center space-y-2">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا
              </p>
              <p className="text-[#8a7a65] text-xs italic">{t('hablum.ankabut_trans')}</p>
              <p className="text-[#8a7a65] text-xs leading-relaxed mt-2">
                {t('hablum.tali_mula')}<br/>
                {t('hablum.tali_sempurna')}
              </p>
              <button onClick={() => setShowUpgradeModal(true)} className="w-full py-2.5 bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium rounded-xl hover:bg-[#c9a96e25] transition-colors mt-1">
                {t('hablum.upgrade_btn')}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'minannas' && isPro && (
        <HablumSection
          type="minannas"
          renungan={MINANNAS_RENUNGAN}
          amalan={MINANNAS_AMALAN_KEYS}
          soalan={MINANNAS_SOALAN_KEYS}
          doaArabic="اللَّهُمَّ أَصْلِحْ ذَاتَ بَيْنِنَا وَأَلِّفْ بَيْنَ قُلُوبِنَا وَاهْدِنَا سُبُلَ السَّلَامِ"
          doaTranslationKey="hablum.minannas.doa_trans"
          accentColor="#f43f5e"
          borderColor="#f43f5e25"
          bgColor="#f43f5e08"
        />
      )}

      {/* Pro gate untuk Hablumminannas */}
      {tab === 'minannas' && !isPro && (
        <div className="bg-[#0d1821] border border-[#f43f5e20] rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#f43f5e10] border border-[#f43f5e20] flex items-center justify-center mx-auto">
            <span className="text-2xl">❤️</span>
          </div>
          <div>
            <p className="font-serif text-[#f43f5e] text-xl">Hablumminannas</p>
            <p className="font-serif text-[#8a7a65] text-sm mt-1" dir="rtl">حَبْلٌ مِّنَ النَّاسِ</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('hablum.gate_desc')}
          </p>
          <div className="bg-[#060d16] border border-[#f43f5e15] rounded-xl p-4 text-center">
            <p className="font-serif text-[#f43f5e] text-sm leading-loose" dir="rtl">
              وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">{t('hablum.gate_maidah_trans')}</p>
          </div>
          <button className="w-full py-3 bg-[#f43f5e] text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
            {t('hablum.gate_btn')}
          </button>
        </div>
      )}

      {showUpgradeModal && <HablumUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  )
}
