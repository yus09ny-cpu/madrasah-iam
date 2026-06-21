import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Lock, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSaveZikir } from '@/hooks/useZikir'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

// ─── Penerangan Screen ────────────────────────────────────────────────────────

const TALQIN_MSG = encodeURIComponent(
  'Assalamualaikum, saya dari app Madrasah I AM.\n\nSaya ingin mengetahui lebih lanjut tentang Zikir Jahar dan Zikir Khafi.\n\nMohon bimbingan. Terima kasih.'
)
const WA_LINK = `https://wa.me/60182119135?text=${TALQIN_MSG}`
const TG_LINK = 'https://t.me/+7Bisf3e1cd4xYTA9'

function PeneranganScreen({
  onYa,
  onKembali,
}: {
  onYa: () => void
  onKembali: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">

      {/* ── SKRIN 1 — HERO ─────────────────────────────────────────────── */}
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center mx-auto">
          <span className="font-serif text-[#c9a96e] text-2xl">✦</span>
        </div>
        <div className="space-y-2">
          <p className="font-serif text-[#c9a96e] text-2xl leading-loose" dir="rtl">
            وَلَذِكْرُ اللَّهِ أَكْبَرُ
          </p>
          <p className="text-[#e8dcc8] text-sm italic leading-relaxed">
            "{t('zikir_khas.hero_trans')}"
          </p>
          <p className="text-[#c9a96e60] text-xs">— Al-Ankabut: 45</p>
        </div>
        <p className="text-[#8a7a65] text-sm leading-relaxed max-w-sm mx-auto">
          {t('zikir_khas.hero_desc')}
        </p>
      </div>

      {/* ── SKRIN 2 — JIWA DAN RAGA ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#e8dcc8] font-serif text-lg">{t('zikir_khas.jiwa_title')}</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-2">
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            {t('zikir_khas.jiwa_intro1')}
          </p>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('zikir_khas.jiwa_intro2')} <span className="text-[#c9a96e] font-medium">{t('zikir_khas.jiwa_highlight')}</span>
          </p>
        </div>

        {/* Kad Kewangan */}
        <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <p className="text-[#c9a96e] font-medium text-sm">{t('zikir_khas.kewangan_title')}</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('zikir_khas.kewangan_desc')}
          </p>
          <div className="space-y-1.5">
            {[
              t('zikir_khas.kewangan_b1'),
              t('zikir_khas.kewangan_b2'),
              t('zikir_khas.kewangan_b3'),
            ].map((text, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#c9a96e] flex-shrink-0">·</span>{text}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">إِنَّ النَّفْسَ لَأَمَّارَةٌ بِالسُّوءِ</p>
            <p className="text-[#8a7a65] text-xs italic">{t('zikir_khas.kewangan_ayat')}</p>
          </div>
        </div>

        {/* Kad Masa */}
        <div className="bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <p className="text-[#60a5fa] font-medium text-sm">{t('zikir_khas.masa_title')}</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('zikir_khas.masa_desc')}
          </p>
          <div className="space-y-1.5">
            {[
              t('zikir_khas.masa_b1'),
              t('zikir_khas.masa_b2'),
              t('zikir_khas.masa_b3'),
            ].map((text, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#60a5fa] flex-shrink-0">·</span>{text}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#60a5fa15] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#60a5fa] text-sm leading-loose" dir="rtl">وَالْعَصْرِ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ</p>
            <p className="text-[#8a7a65] text-xs italic">{t('zikir_khas.masa_ayat')}</p>
          </div>
        </div>

        {/* Kad Tenaga */}
        <div className="bg-[#0d1821] border border-[#4ade8030] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <p className="text-[#4ade80] font-medium text-sm">{t('zikir_khas.tenaga_title')}</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('zikir_khas.tenaga_desc')}
          </p>
          <div className="space-y-1.5">
            {[
              t('zikir_khas.tenaga_b1'),
              t('zikir_khas.tenaga_b2'),
              t('zikir_khas.tenaga_b3'),
            ].map((text, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#4ade80] flex-shrink-0">·</span>{text}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#4ade8015] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#4ade80] text-sm leading-loose" dir="rtl">أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</p>
            <p className="text-[#8a7a65] text-xs italic">{t('zikir_khas.tenaga_ayat')}</p>
          </div>
        </div>

        {/* Kad Orang Tersayang */}
        <div className="bg-[#0d1821] border border-[#f43f5e30] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">❤️</span>
            <p className="text-[#f43f5e] font-medium text-sm">{t('zikir_khas.cinta_title')}</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('zikir_khas.cinta_desc')}
          </p>
          <div className="space-y-1.5">
            {[
              t('zikir_khas.cinta_b1'),
              t('zikir_khas.cinta_b2'),
              t('zikir_khas.cinta_b3'),
            ].map((text, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#f43f5e] flex-shrink-0">·</span>{text}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#f43f5e15] rounded-xl p-3 space-y-1.5">
            <p className="text-[#8a7a65] text-xs leading-relaxed text-center">
              {t('zikir_khas.cinta_c1')}
            </p>
            <p className="text-[#f43f5e] text-xs text-center font-medium">
              {t('zikir_khas.cinta_c2')}
            </p>
          </div>
        </div>
      </div>

      {/* ── SKRIN 3 — 2 PENGHALANG UTAMA ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#e8dcc8] font-serif text-lg">{t('zikir_khas.halang_title')}</p>
          <p className="text-[#8a7a65] text-sm">{t('zikir_khas.halang_sub')}</p>
        </div>

        {/* Syaitan */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(127,29,29,0.5)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-700 flex-shrink-0" />
            <p className="text-red-400 text-xs font-medium uppercase tracking-wider">{t('zikir_khas.syaitan_label')}</p>
          </div>
          <p className="font-serif text-red-300 text-sm leading-loose text-right" dir="rtl">
            ثُمَّ لَآتِيَنَّهُم مِّن بَيْنِ أَيْدِيهِمْ وَمِنْ خَلْفِهِمْ وَعَنْ أَيْمَانِهِمْ وَعَن شَمَائِلِهِمْ
          </p>
          <p className="text-red-300/60 text-xs italic leading-relaxed">
            {t('zikir_khas.syaitan_trans')}
          </p>
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            {t('zikir_khas.syaitan_body1')} <strong className="text-red-400">{t('zikir_khas.syaitan_highlight')}</strong>{t('zikir_khas.syaitan_body2')}
          </p>
        </div>

        {/* Nafsu */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(124,45,18,0.15)', border: '1px solid rgba(124,45,18,0.5)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-700 flex-shrink-0" />
            <p className="text-orange-400 text-xs font-medium uppercase tracking-wider">{t('zikir_khas.nafsu_label')}</p>
          </div>
          <p className="font-serif text-orange-300 text-sm leading-loose text-right" dir="rtl">
            إِنَّ النَّفْسَ لَأَمَّارَةٌ بِالسُّوءِ إِلَّا مَا رَحِمَ رَبِّي
          </p>
          <p className="text-orange-300/60 text-xs italic leading-relaxed">
            {t('zikir_khas.nafsu_trans')}
          </p>
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            {t('zikir_khas.nafsu_body1')} <strong className="text-orange-400">{t('zikir_khas.nafsu_highlight')}</strong>{t('zikir_khas.nafsu_body2')}
          </p>
        </div>
      </div>

      {/* ── SKRIN 4 — PREVENTION IS BETTER THAN CURE ──────────────────── */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-6 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#c9a96e] font-medium text-base">{t('zikir_khas.prevention_title')}</p>
          <p className="text-[#8a7a65] text-xs italic">{t('zikir_khas.prevention_sub')}</p>
        </div>
        <div className="space-y-3 text-sm text-[#8a7a65] leading-relaxed">
          <p>{t('zikir_khas.prevention_body1')}</p>
          <p className="text-[#e8dcc8]">{t('zikir_khas.prevention_tapi')}</p>
          <div className="space-y-2 border-l-2 border-[#c9a96e30] pl-4">
            <p>{t('zikir_khas.prevention_q1a')} <span className="text-[#c9a96e]">{t('zikir_khas.prevention_q1b')}</span> {t('zikir_khas.prevention_q1c')}</p>
            <p>{t('zikir_khas.prevention_q2a')} <span className="text-[#c9a96e]">{t('zikir_khas.prevention_q2b')}</span> {t('zikir_khas.prevention_q2c')}</p>
            <p>{t('zikir_khas.prevention_q3a')} <span className="text-[#c9a96e]">{t('zikir_khas.prevention_q3b')}</span> {t('zikir_khas.prevention_q3c')}</p>
          </div>
          <p className="text-[#e8dcc8]">{t('zikir_khas.prevention_c1')}</p>
          <p>{t('zikir_khas.prevention_c2a')} <span className="text-[#c9a96e] font-medium">{t('zikir_khas.prevention_c2b')}</span></p>
        </div>
      </div>

      {/* ── SKRIN 5 — SOLUSI: ZIKIR KHAS ──────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.1) 0%, rgba(201,169,110,0.05) 100%)', border: '1px solid rgba(201,169,110,0.3)' }}>
        <div className="text-center space-y-1">
          <p className="font-serif text-[#c9a96e] text-lg">{t('zikir_khas.solusi_title')}</p>
          <p className="text-[#8a7a65] text-xs">{t('zikir_khas.solusi_sub')}</p>
        </div>
        <p className="text-[#c9a96e] text-sm font-medium text-center">{t('zikir_khas.solusi_tagline1')} <strong>{t('zikir_khas.solusi_tagline2')}</strong></p>
        <div className="space-y-3">
          <div className="bg-[#060d16] border border-[#60a5fa20] rounded-xl p-4 space-y-2">
            <p className="text-[#60a5fa] text-xs font-medium">{t('zikir_khas.solusi_jahar_label')}</p>
            <p className="font-serif text-[#60a5fa] text-base leading-loose text-center" dir="rtl">لَا إِلَٰهَ إِلَّا اللَّهُ</p>
            <p className="text-[#8a7a65] text-xs leading-relaxed">{t('zikir_khas.solusi_jahar_body')}</p>
          </div>
          <div className="bg-[#060d16] border border-[#a78bfa20] rounded-xl p-4 space-y-2">
            <p className="text-[#a78bfa] text-xs font-medium">{t('zikir_khas.solusi_khafi_label')}</p>
            <p className="font-serif text-[#a78bfa] text-xl leading-loose text-center" dir="rtl">اَللَّه</p>
            <p className="text-[#8a7a65] text-xs leading-relaxed">{t('zikir_khas.solusi_khafi_body')}</p>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('zikir_khas.solusi_bersama')}
          </p>
          <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">وَلَذِكْرُ اللَّهِ أَكْبَرُ</p>
          <p className="text-[#8a7a65] text-xs leading-relaxed">
            {t('zikir_khas.solusi_closing1')} <strong className="text-[#c9a96e]">{t('zikir_khas.solusi_closing2')}</strong> {t('zikir_khas.solusi_closing3')}
          </p>
        </div>
      </div>

      {/* ── SKRIN 6 — CTA ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#e8dcc8] font-serif text-lg">{t('zikir_khas.cta_title')}</p>
          <p className="text-[#c9a96e] text-sm font-medium">{t('zikir_khas.cta_sub')}</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            {t('zikir_khas.cta_body')}
          </p>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ</p>
            <p className="text-[#8a7a65] text-xs italic">{t('zikir_khas.cta_ayat')}</p>
          </div>
        </div>
        <button
          onClick={onYa}
          className="w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
        >
          {t('zikir_khas.cta_button')}
        </button>
        <button
          onClick={onKembali}
          className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#c9a96e30] transition-all"
        >
          {t('zikir_khas.cta_back')}
        </button>
      </div>
    </div>
  )
}

// ─── Hubungi Screen ───────────────────────────────────────────────────────────

function HubungiScreen({
  onBorang,
  onKembali,
}: {
  onBorang: () => void
  onKembali: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onKembali}
        className="flex items-center gap-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors text-sm"
      >
        <ArrowLeft size={15} /> {t('umum.kembali')}
      </button>

      {/* Header */}
      <div className="text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-xl font-medium">{t('zikir_khas.hubungi_title')}</p>
      </div>

      {/* Penerangan */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          {t('zikir_khas.hubungi_body')}
        </p>
        <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center space-y-1.5">
          <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
            فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ
          </p>
          <p className="text-[#8a7a65] text-xs italic">
            {t('zikir_khas.cta_ayat')}
          </p>
        </div>
        <p className="text-[#8a7a65] text-sm text-center">
          {t('zikir_khas.hubungi_contact')}
        </p>
      </div>

      {/* WhatsApp */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ backgroundColor: '#25D366' }}
      >
        <span className="text-xl">📱</span>
        WhatsApp Madrasah I AM
      </a>

      {/* Telegram */}
      <a
        href={TG_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ backgroundColor: '#0088CC' }}
      >
        <span className="text-xl">💬</span>
        Telegram Madrasah I AM
      </a>

      {/* Borang talqin */}
      <div className="text-center space-y-3">
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          {t('zikir_khas.hubungi_borang_desc')}
        </p>
        <button
          onClick={onBorang}
          className="w-full py-3.5 rounded-2xl text-sm font-medium border border-[#c9a96e40] text-[#c9a96e] bg-[#c9a96e10] hover:bg-[#c9a96e20] transition-colors"
        >
          {t('zikir_khas.hubungi_borang_btn')}
        </button>
      </div>

      {/* Penutup */}
      <div className="text-center space-y-2 pt-2">
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
          إِلَٰهِي أَنْتَ مَقْصُودِي وَرِضَاكَ مَطْلُوبِي
        </p>
        <p className="text-[#8a7a65] text-xs italic">
          "{t('zikir_khas.hubungi_penutup')}"
        </p>
      </div>
    </div>
  )
}

// ─── Talqin Request Form ───────────────────────────────────────────────────────

interface TalqinFormProps {
  zikirType: 'jahar' | 'khafi'
  userId: string
  onSuccess: () => void
}

function TalqinForm({ zikirType, userId, onSuccess }: TalqinFormProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    full_name: '', phone: '', location: '',
    preferred_time: 'Pagi', language: 'bm', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function update(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.phone || !form.location) return
    setSubmitting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('talqin_requests') as any).insert({
        user_id: userId,
        zikir_type: zikirType,
        full_name: form.full_name,
        phone: form.phone,
        location: form.location,
        preferred_time: form.preferred_time,
        language: form.language,
        notes: form.notes || null,
      })
    } catch { /* table may not exist yet — continue */ }
    setDone(true)
    onSuccess()
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-6 text-center space-y-3">
        <CheckCircle2 size={36} className="text-[#60a5fa] mx-auto" />
        <p className="font-serif text-[#60a5fa] text-lg">Alhamdulillah</p>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          {t('zikir_khas.form_success')}
        </p>
      </div>
    )
  }

  const inputClass = "w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#60a5fa40] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none transition-colors"
  const labelClass = "block text-xs font-medium text-[#8a7a65] uppercase tracking-wider mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>{t('zikir_khas.form_nama')}</label>
        <input
          type="text"
          value={form.full_name}
          onChange={e => update('full_name', e.target.value)}
          placeholder={t('zikir_khas.form_nama_ph')}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t('zikir_khas.form_telefon')}</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => update('phone', e.target.value)}
          placeholder="+60 12-345 6789"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t('zikir_khas.form_negeri')}</label>
        <input
          type="text"
          value={form.location}
          onChange={e => update('location', e.target.value)}
          placeholder={t('zikir_khas.form_negeri_ph')}
          required
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{t('zikir_khas.form_masa')}</label>
          <select
            value={form.preferred_time}
            onChange={e => update('preferred_time', e.target.value)}
            className={inputClass}
          >
            {[
              { val: 'Pagi', label: t('zikir_khas.form_masa_pagi') },
              { val: 'Tengahari', label: t('zikir_khas.form_masa_tengahari') },
              { val: 'Petang', label: t('zikir_khas.form_masa_petang') },
              { val: 'Malam', label: t('zikir_khas.form_masa_malam') },
            ].map(({ val, label }) => (
              <option key={val} value={val} className="bg-[#0d1821]">{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Bahasa</label>
          <select
            value={form.language}
            onChange={e => update('language', e.target.value)}
            className={inputClass}
          >
            <option value="bm" className="bg-[#0d1821]">Bahasa Melayu</option>
            <option value="en" className="bg-[#0d1821]">English</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>{t('zikir_khas.form_catatan')}</label>
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder={t('zikir_khas.form_catatan_ph')}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !form.full_name || !form.phone || !form.location}
        className="w-full py-3.5 bg-[#60a5fa] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#93c5fd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        {t('zikir_khas.form_submit')}
      </button>
    </form>
  )
}

// ─── Zikir Jahar Section ───────────────────────────────────────────────────────

function ZikirJahar() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { mutateAsync: saveZikir, isPending } = useSaveZikir()
  const today = format(new Date(), 'yyyy-MM-dd')
  // 'talqin_jahar' bukan lajur dalam 'profiles' — anggap belum ditalqin
  // sehingga status ini disokong dalam pangkalan data.
  const isTalqin = false

  const [jaharSaved, setJaharSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSave() {
    try {
      await saveZikir({
        type: 'jahar',
        zikir_name: 'La ilaha illallah',
        count: 1,
        target: 1,
        completed: true,
        date: today,
      })
      setJaharSaved(true)
    } catch { /* table not yet created */ }
  }

  // Talqin users — tunjuk hanya teks zikir + catat sesi
  if (isTalqin) {
    return (
      <div className="space-y-4">
        <div className="bg-[#0d1821] border border-[#60a5fa20] rounded-2xl p-6 text-center space-y-5">
          <p className="font-serif text-[#60a5fa] leading-loose" style={{ fontSize: 'clamp(2rem, 8vw, 3rem)' }} dir="rtl">
            لَا إِلَٰهَ إِلَّا اللَّهُ
          </p>
          <div className="space-y-1">
            <p className="text-[#e8dcc8] text-sm">La ilaha illallah</p>
            <p className="text-[#8a7a65] text-xs">{t('zikir_khas.jahar_tahlil_meaning')}</p>
          </div>
          <div className="h-px bg-[#1e2d40]" />
          {jaharSaved ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={18} className="text-[#60a5fa]" />
              <p className="text-[#60a5fa] text-sm">{t('zikir_khas.jahar_dicatat')}</p>
            </div>
          ) : (
            <button onClick={handleSave} disabled={isPending}
              className="w-full py-3 bg-[#60a5fa15] border border-[#60a5fa40] text-[#60a5fa] rounded-xl text-sm font-medium hover:bg-[#60a5fa25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {t('zikir_khas.jahar_catat')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Tajuk */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#60a5fa15] border border-[#60a5fa30] flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🌊</span>
        </div>
        <div>
          <p className="text-[#60a5fa] font-serif text-base">Zikir Jahar</p>
          <p className="font-serif text-[#8a7a65] text-xs" dir="rtl">لَا إِلَٰهَ إِلَّا اللَّهُ</p>
        </div>
      </div>

      {/* Kad 1 — Ancaman Iblis */}
      <div className="bg-[#0d1821] border border-red-900/40 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          <p className="text-red-400 text-xs font-medium uppercase tracking-wider">{t('zikir_khas.jahar_ancaman_label')}</p>
        </div>
        <p className="font-serif text-red-300 text-sm leading-loose text-right" dir="rtl">
          ثُمَّ لَآتِيَنَّهُم مِّن بَيْنِ أَيْدِيهِمْ وَمِنْ خَلْفِهِمْ وَعَنْ أَيْمَانِهِمْ وَعَن شَمَائِلِهِمْ ۖ وَلَا تَجِدُ أَكْثَرَهُمْ شَاكِرِينَ
        </p>
        <p className="text-[#8a7a65] text-xs leading-relaxed italic">
          {t('zikir_khas.jahar_ancaman_trans')}
        </p>
        <p className="text-red-500/50 text-xs">— Al-A'raf: 17</p>
      </div>

      {/* Kad 2 — Benteng Perlindungan */}
      <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c9a96e] flex-shrink-0" />
          <p className="text-[#c9a96e] text-xs font-medium uppercase tracking-wider">{t('zikir_khas.jahar_benteng_label')}</p>
        </div>
        <p className="font-serif text-[#c9a96e] text-base leading-loose text-right" dir="rtl">
          لَا إِلَهَ إِلَّا اللَّهُ حِصْنِي فَمَنْ دَخَلَ حِصْنِي أَمِنَ مِنْ عَذَابِي
        </p>
        <p className="text-[#8a7a65] text-xs leading-relaxed italic">
          {t('zikir_khas.jahar_benteng_trans')}
        </p>
        <p className="text-[#c9a96e60] text-xs">{t('zikir_khas.jahar_benteng_source')}</p>
      </div>

      {/* Kad 3 — Kesimpulan */}
      <div className="bg-[#060d16] border border-[#60a5fa20] rounded-2xl p-5 text-center space-y-2">
        <p className="text-[#60a5fa] font-medium text-sm">{t('zikir_khas.jahar_faham_title')}</p>
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          {t('zikir_khas.jahar_faham_desc')}
        </p>
        <p className="font-serif text-[#60a5fa] text-lg" dir="rtl">لَا إِلَٰهَ إِلَّا اللَّهُ</p>
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          {t('zikir_khas.jahar_talkin_note')}
        </p>
      </div>

      {/* State: Belum talqin */}
      {!submitted && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#60a5fa20] rounded-2xl p-5">
            <p className="text-[#60a5fa] font-medium text-sm mb-1">{t('zikir_khas.jahar_talkin_title')}</p>
            <p className="text-[#8a7a65] text-xs mb-4 leading-relaxed">
              {t('zikir_khas.jahar_talkin_desc')}
            </p>
            <TalqinForm zikirType="jahar" userId={user?.id ?? ''} onSuccess={() => setSubmitted(true)} />
          </div>
        </div>
      )}

      {/* State: Sudah hantar borang */}
      {submitted && (
        <div className="bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-5 text-center space-y-2">
          <p className="text-[#60a5fa] text-sm font-medium">{t('zikir_khas.jahar_menunggu')}</p>
          <p className="text-[#8a7a65] text-xs leading-relaxed">
            {t('zikir_khas.jahar_menunggu_desc')}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Zikir Khafi Section ───────────────────────────────────────────────────────

function ZikirKhafi({ hasJaharRequest: _hasJaharRequest }: { hasJaharRequest: boolean }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {/* Context strip */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-8 h-8 rounded-xl bg-[#a78bfa15] border border-[#a78bfa30] flex items-center justify-center flex-shrink-0">
          <span className="text-sm">💜</span>
        </div>
        <div>
          <p className="text-[#a78bfa] font-serif text-sm">{t('zikir_khas.khafi_title')}</p>
          <p className="font-serif text-[#a78bfa60] text-xs" dir="rtl">أَفْضَلُ الذِّكْرِ مَا خَفِيَ</p>
        </div>
      </div>

      {/* Lovable embed */}
      <div className="rounded-2xl overflow-hidden border border-[#a78bfa30]" style={{ height: 'calc(100dvh - 220px)', minHeight: '480px' }}>
        <iframe
          src="https://zikirkhafi.lovable.app"
          title="Zikir Khafi — Madrasah I AM"
          className="w-full h-full border-0"
          allow="vibrate; autoplay"
          loading="lazy"
        />
      </div>
    </div>
  )
}

// ─── Pro Analytics ────────────────────────────────────────────────────────────

interface AnalyticsData {
  lifetimeTotal: number
  streak: number
  bestDay: number
  favoriteZikir: string
  favoriteTime: string
  sevenDays: { label: string; count: number; max: number }[]
  breakdown: { name: string; count: number; pct: number; hex: string }[]
}

const ZIKIR_COLORS: Record<string, string> = {
  'Subhanallah': '#34d399', 'Alhamdulillah': '#fbbf24', 'Allahu Akbar': '#f87171',
  'La ilaha illallah': '#60a5fa', "Allahumma Solli 'ala Muhammad": '#c9a96e',
  "Astaghfirullahal 'Azim": '#a78bfa', 'La ilaha illallah (Jahar)': '#60a5fa',
  'Zikir Khafi': '#a78bfa',
}

function processAnalytics(
  sessions: { count: number; date: string; zikir_name: string; completed: boolean; created_at: string }[],
  t: (key: string) => string
): AnalyticsData {
  const lifetimeTotal = sessions.reduce((s, r) => s + r.count, 0)

  // By date
  const byDate = new Map<string, number>()
  sessions.forEach(r => byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.count))

  // Streak
  const dates = [...byDate.keys()].sort((a, b) => a > b ? -1 : 1)
  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i])
    const expected = new Date()
    expected.setDate(expected.getDate() - i)
    if (d.toDateString() === expected.toDateString()) streak++
    else break
  }

  const bestDay = Math.max(...Array.from(byDate.values()), 0)

  // Favorite zikir
  const byZikir = new Map<string, number>()
  sessions.forEach(r => byZikir.set(r.zikir_name, (byZikir.get(r.zikir_name) ?? 0) + r.count))
  const favZikirEntry = [...byZikir.entries()].sort((a, b) => b[1] - a[1])[0]
  const favoriteZikir = favZikirEntry ? favZikirEntry[0] : '—'

  // Favorite time
  const periods = { pagi: 0, tengahari: 0, petang: 0, malam: 0 }
  sessions.forEach(r => {
    const h = new Date(r.created_at).getHours()
    if (h >= 4 && h < 12) periods.pagi += r.count
    else if (h >= 12 && h < 16) periods.tengahari += r.count
    else if (h >= 16 && h < 20) periods.petang += r.count
    else periods.malam += r.count
  })
  const maxP = Math.max(...Object.values(periods))
  const favoriteTime = maxP === 0 ? '—' :
    maxP === periods.pagi ? t('zikir_khas.waktu_pagi') :
    maxP === periods.tengahari ? t('zikir_khas.waktu_tengahari') :
    maxP === periods.petang ? t('zikir_khas.waktu_petang') : t('zikir_khas.waktu_malam')

  // 7-day chart
  const today = new Date()
  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getDate()}/${d.getMonth() + 1}`
    return { label, count: byDate.get(key) ?? 0, max: 0 }
  })
  const maxCount = Math.max(...sevenDays.map(d => d.count), 1)
  sevenDays.forEach(d => { d.max = maxCount })

  // Breakdown
  const total = Array.from(byZikir.values()).reduce((s, v) => s + v, 0) || 1
  const breakdown = [...byZikir.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({
      name, count,
      pct: Math.round((count / total) * 100),
      hex: ZIKIR_COLORS[name] ?? '#c9a96e',
    }))

  return { lifetimeTotal, streak, bestDay, favoriteZikir, favoriteTime, sevenDays, breakdown }
}

function ZikirProAnalytics() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    const query = supabase
      .from('zikir_sessions')
      .select('count, date, zikir_name, completed, created_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(500)

    Promise.resolve(query).then(({ data }) => {
      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAnalytics(processAnalytics(data as any, t))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user?.id, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={24} className="text-[#c9a96e] animate-spin" />
      </div>
    )
  }

  if (!analytics || analytics.lifetimeTotal === 0) {
    return (
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-6 text-center space-y-2">
        <p className="text-[#c9a96e] font-serif text-lg">بِسْمِ اللَّهِ</p>
        <p className="text-[#e8dcc8] text-sm">{t('zikir_khas.analitik_empty_body')}</p>
        <p className="text-[#8a7a65] text-xs">{t('zikir_khas.analitik_empty_sub')}</p>
      </div>
    )
  }

  const maxBar = Math.max(...analytics.sevenDays.map(d => d.count), 1)

  return (
    <div className="space-y-4">

      {/* Headline message */}
      <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-2xl">{analytics.lifetimeTotal.toLocaleString()}</p>
        <p className="text-[#e8dcc8] text-sm">{t('zikir_khas.analitik_lifetime')}</p>
        <p className="text-[#8a7a65] text-xs italic">{t('zikir_khas.analitik_lifetime_sub')}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('zikir_khas.analitik_streak'), value: `${analytics.streak} hari`, icon: '🔥', color: '#f87171' },
          { label: t('zikir_khas.analitik_rekod'), value: `${analytics.bestDay.toLocaleString()}/hari`, icon: '🏆', color: '#fbbf24' },
          { label: t('zikir_khas.analitik_kegemaran'), value: analytics.favoriteZikir.split(' ').slice(0, 2).join(' '), icon: '⭐', color: '#c9a96e' },
          { label: t('zikir_khas.analitik_waktu'), value: analytics.favoriteTime, icon: '⏰', color: '#60a5fa' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-1">
            <p className="text-lg">{icon}</p>
            <p className="font-semibold text-sm" style={{ color }}>{value}</p>
            <p className="text-[#8a7a65] text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* 7-day bar chart */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-medium text-[#e8dcc8]">{t('zikir_khas.analitik_7hari')}</p>
        <div className="flex items-end gap-1.5 h-20">
          {analytics.sevenDays.map(({ label, count }) => {
            const pct = maxBar > 0 ? (count / maxBar) * 100 : 0
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm transition-all duration-500" style={{
                  height: `${Math.max(pct, count > 0 ? 8 : 2)}%`,
                  backgroundColor: count > 0 ? '#c9a96e' : '#1e2d40',
                  minHeight: '4px'
                }} />
                <p className="text-[#8a7a65] text-[9px]">{label}</p>
              </div>
            )
          })}
        </div>
        <p className="text-[#8a7a65] text-xs text-center">{t('zikir_khas.analitik_jumlah')}</p>
      </div>

      {/* Pecahan zikir */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-medium text-[#e8dcc8]">{t('zikir_khas.analitik_pecahan')}</p>
        <div className="space-y-2">
          {analytics.breakdown.map(({ name, count, pct, hex }) => (
            <div key={name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#8a7a65] truncate pr-2">{name}</span>
                <span style={{ color: hex }}>{count.toLocaleString()} ({pct}%)</span>
              </div>
              <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hex }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

type KhasScreen = 'penerangan' | 'hubungi' | 'content'

export default function ZikirKhas({ onBackToAmm }: { onBackToAmm?: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isPro = user?.tier === 'pro' || user?.tier === 'family'
  // 'talqin_jahar'/'talqin_khafi' bukan lajur dalam 'profiles' — anggap belum
  // ditalqin sehingga status ini disokong dalam pangkalan data.
  const hasTalqin = false

  const [screen, setScreen] = useState<KhasScreen>(hasTalqin ? 'content' : 'penerangan')
  const [hasJaharRequest, setHasJaharRequest] = useState(false)
  const [khasTab, setKhasTab] = useState<'jahar' | 'khafi' | 'analitik'>('jahar')

  // Check if user has submitted a talqin request (Pro only)
  useEffect(() => {
    if (!user?.id || !isPro) return
    const query = supabase
      .from('talqin_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('zikir_type', 'jahar')
      .limit(1)

    Promise.resolve(query)
      .then(({ data }) => { if (data && data.length > 0) setHasJaharRequest(true) })
      .catch(() => {})
  }, [user?.id, isPro])

  // Penerangan — semua pengguna (Free & Pro) tanpa talqin
  if (screen === 'penerangan') {
    return (
      <PeneranganScreen
        onYa={() => setScreen('hubungi')}
        onKembali={() => onBackToAmm?.()}
      />
    )
  }

  // Hubungi — selepas klik "Ya"
  if (screen === 'hubungi') {
    return (
      <HubungiScreen
        onBorang={() => setScreen('content')}
        onKembali={() => setScreen('penerangan')}
      />
    )
  }

  // Content — pengguna sudah talqin atau akses terus dari borang
  // Free user tanpa talqin yang akses via borang: tunjuk penerangan lembut
  if (!isPro && !hasTalqin) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setScreen('penerangan')}
          className="flex items-center gap-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors text-sm"
        >
          <ArrowLeft size={15} /> {t('umum.kembali')}
        </button>
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-6 text-center space-y-4">
          <Lock size={32} className="text-[#c9a96e] mx-auto" />
          <div>
            <p className="text-[#c9a96e] font-serif text-xl mb-2">Zikir Khas</p>
            <p className="text-[#e8dcc8] text-sm leading-relaxed">
              {t('zikir_khas.locked_body')}
            </p>
          </div>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4">
            <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
              وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">
              {t('zikir_khas.locked_ayat')}
            </p>
          </div>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            {t('zikir_khas.locked_wa')}
          </a>
        </div>
      </div>
    )
  }

  // Pro content: sub-tab Jahar / Khafi / Analitik
  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1">
        {([
          { id: 'jahar',    label: '🌊 Zikir Jahar' },
          { id: 'khafi',    label: '💜 Zikir Khafi' },
          { id: 'analitik', label: t('zikir_khas.tab_analitik') },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setKhasTab(tab.id)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-medium transition-all',
              khasTab === tab.id ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {khasTab === 'jahar' && <ZikirJahar />}
      {khasTab === 'khafi' && <ZikirKhafi hasJaharRequest={hasJaharRequest} />}
      {khasTab === 'analitik' && <ZikirProAnalytics />}
    </div>
  )
}
