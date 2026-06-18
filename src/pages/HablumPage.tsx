import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'

function HablumUpgradeModal({ onClose }: { onClose: () => void }) {
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
      if (!res.ok || !data.url) throw new Error(data?.error?.message ?? 'Gagal mencipta bil')
      window.location.href = data.url
    } catch { setError('Gagal memulakan pembayaran. Sila cuba lagi.'); setLoadingPkg(null) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-medium text-sm">Buka Hablumminannas</p>
        </div>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">Akses refleksi, amalan, dan doa untuk tali hubungan dengan manusia — keluarga, sahabat, dan komuniti.</p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="space-y-2">
          <button onClick={() => handleUpgrade('pro')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro' && <Loader2 size={14} className="animate-spin" />}
            Upgrade ke Pro — RM19.90/bulan
          </button>
          <button onClick={() => handleUpgrade('pro_plus')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro_plus' && <Loader2 size={14} className="animate-spin" />}
            Upgrade ke Pro Plus — RM29.90/bulan
          </button>
          <button onClick={onClose} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors disabled:opacity-60">
            Tutup
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
  {
    arabic: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا',
    translation: 'Dan berpeganglah kamu semuanya kepada tali Allah, dan janganlah kamu bercerai-berai',
    source: 'Ali Imran: 103',
  },
  {
    arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ وَلَذِكْرُ اللَّهِ أَكْبَرُ',
    translation: 'Sesungguhnya solat mencegah perbuatan keji dan mungkar, dan sesungguhnya mengingati Allah adalah lebih besar',
    source: 'Al-Ankabut: 45',
  },
  {
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    translation: 'Ketahuilah, hanya dengan mengingati Allah hati menjadi tenang',
    source: "Ar-Ra'd: 28",
  },
]

const MINALLAH_AMALAN = [
  'Solat 5 waktu dengan khusyuk dan tepat waktu',
  'Membaca Al-Quran walaupun 5 ayat hari ini',
  'Berzikir selepas setiap solat',
  'Berdoa dengan penuh harap dan yakin',
  'Memberi sedekah walaupun sedikit',
  'Menjauhi perkara yang haram dengan sedar',
]

const MINALLAH_SOALAN = [
  'Adakah saya solat hari ini dengan khusyuk?',
  'Apakah amal terbaik saya bersama Allah hari ini?',
  'Apakah yang menghalang hubungan saya dengan Allah?',
  'Apakah nikmat Allah yang paling saya syukuri hari ini?',
  'Apakah azam saya untuk mendekatkan diri kepada Allah esok?',
]

const MINANNAS_RENUNGAN = [
  {
    arabic: 'وَالَّذِينَ يَصِلُونَ مَا أَمَرَ اللَّهُ بِهِ أَن يُوصَلَ وَيَخْشَوْنَ رَبَّهُمْ',
    translation: 'Dan orang-orang yang menghubungkan apa yang diperintahkan Allah agar dihubungkan, dan mereka takut kepada Tuhan mereka',
    source: 'Ar-Ra\'d: 21',
  },
  {
    arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
    translation: 'Tidak sempurna iman seseorang kamu sehingga dia mencintai untuk saudaranya apa yang dia cintai untuk dirinya',
    source: 'HR Bukhari & Muslim',
  },
  {
    arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ',
    translation: 'Dan tolong-menolonglah dalam kebaikan dan ketakwaan, dan jangan tolong-menolong dalam dosa dan permusuhan',
    source: 'Al-Maidah: 2',
  },
]

const MINANNAS_AMALAN = [
  'Senyum kepada orang yang ditemui hari ini',
  'Tanya khabar keluarga atau sahabat',
  'Membantu orang yang memerlukan tanpa diminta',
  'Berkata baik atau diam — jaga lisan',
  'Memaafkan orang yang bersalah dalam hati',
  'Mendoakan orang yang dicintai secara ikhlas',
]

const MINANNAS_SOALAN = [
  'Adakah saya menjaga hubungan baik dengan keluarga hari ini?',
  'Adakah perkataan saya membina atau menyakiti orang lain?',
  'Apakah kebaikan yang saya lakukan untuk orang lain hari ini?',
  'Adakah ada seseorang yang perlu saya maafkan atau minta maaf?',
  'Bagaimana saya boleh menjadi lebih baik kepada orang di sekeliling esok?',
]

// ─── Section Component ────────────────────────────────────────────────────────

interface SectionProps {
  type: 'minallah' | 'minannas'
  renungan: typeof MINALLAH_RENUNGAN
  amalan: string[]
  soalan: string[]
  doaArabic: string
  doaTranslation: string
  accentColor: string
  borderColor: string
  bgColor: string
}

function HablumSection({ type, renungan, amalan, soalan, doaArabic, doaTranslation, accentColor, borderColor, bgColor }: SectionProps) {
  const { user } = useAuthStore()
  const [renunganIdx, setRenunganIdx] = useState(0)
  const [checklist, setChecklist] = useState<boolean[]>(new Array(amalan.length).fill(false))
  const [answers, setAnswers] = useState<string[]>(new Array(soalan.length).fill(''))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setRenunganIdx(i => (i + 1) % renungan.length), 6000)
    return () => clearInterval(t)
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
        question: q,
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
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">"{renunganItem.translation}"</p>
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
          <p className="text-sm font-medium text-[#e8dcc8]">Amalan Harian</p>
          <span className="text-xs" style={{ color: accentColor }}>{amalanDone}/{amalan.length}</span>
        </div>
        {amalan.map((item, i) => (
          <button key={i} onClick={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
            className="w-full flex items-start gap-3 text-left group">
            <div className={cn('min-w-[18px] min-h-[18px] w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all')}
              style={{ borderColor: checklist[i] ? accentColor : '#2a3d55', backgroundColor: checklist[i] ? accentColor : 'transparent' }}>
              {checklist[i] && <CheckCircle2 size={11} className="text-[#060d16]" />}
            </div>
            <p className={cn('text-sm leading-snug', checklist[i] ? 'line-through opacity-60' : 'text-[#e8dcc8]')}
              style={{ color: checklist[i] ? accentColor : undefined }}>
              {item}
            </p>
          </button>
        ))}
      </div>

      {/* 5 Soalan Refleksi */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
        <p className="text-sm font-medium text-[#e8dcc8]">Refleksi Harian <span className="text-[#8a7a65] font-normal">({answeredCount}/{soalan.length})</span></p>
        {soalan.map((q, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-xs text-[#8a7a65]">{i + 1}. {q}</p>
            <textarea
              value={answers[i]}
              onChange={e => setAnswers(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder="Tuliskan dengan jujur..."
              rows={2}
              disabled={saved}
              className={cn(inputClass, 'resize-none disabled:opacity-60 disabled:cursor-not-allowed')}
            />
          </div>
        ))}
      </div>

      {/* Doa penutup */}
      <div className="bg-[#060d16] rounded-2xl p-5 text-center space-y-2" style={{ border: `1px solid ${accentColor}20` }}>
        <p className="text-xs text-[#8a7a65] uppercase tracking-wider">Doa Penutup</p>
        <p className="font-serif text-sm leading-loose text-right" style={{ color: accentColor }} dir="rtl">
          {doaArabic}
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">{doaTranslation}</p>
      </div>

      {/* Save */}
      {saved ? (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl border" style={{ borderColor: `${accentColor}30` }}>
          <CheckCircle2 size={18} style={{ color: accentColor }} />
          <p className="text-sm font-serif" style={{ color: accentColor }}>Alhamdulillah. Tersimpan.</p>
        </div>
      ) : (
        <button onClick={handleSave} disabled={saving || answeredCount === 0}
          className="w-full py-4 font-semibold rounded-2xl text-[#060d16] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: accentColor }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Simpan Refleksi Hari Ini
        </button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HablumPage() {
  const { user } = useAuthStore()
  const isPro = user?.tier === 'pro' || user?.tier === 'family'
  const [tab, setTab] = useState<'minallah' | 'minannas'>('minallah')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-8">

      {/* Header */}
      <div>
        <p className="font-serif text-3xl text-[#c9a96e] leading-none">حَبْل</p>
        <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">Dua Tali Hubungan</h1>
        <p className="text-[#8a7a65] text-sm mt-0.5">Ali Imran: 112</p>
      </div>

      {/* Ayat rujukan */}
      <div className="bg-[#0d1821] border border-[#c9a96e15] rounded-2xl p-4 text-center">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
          إِلَّا بِحَبْلٍ مِّنَ اللَّهِ وَحَبْلٍ مِّنَ النَّاسِ
        </p>
        <p className="text-[#8a7a65] text-xs mt-1.5 italic">
          "...kecuali dengan tali hubungan dari Allah dan tali hubungan dari manusia"
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1 gap-1">
        <button onClick={() => setTab('minallah')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
            tab === 'minallah' ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          ✦ Hablumminallah
        </button>
        <button onClick={() => !isPro ? null : setTab('minannas')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            tab === 'minannas' ? 'bg-[#f43f5e] text-white' :
            !isPro ? 'text-[#8a7a65] cursor-default' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          {!isPro && <Lock size={12} />}
          ❤️ Hablumminannas
        </button>
      </div>

      {/* Content */}
      {tab === 'minallah' && (
        <>
          <HablumSection
            type="minallah"
            renungan={isPro ? MINALLAH_RENUNGAN : MINALLAH_RENUNGAN.slice(0, 1)}
            amalan={isPro ? MINALLAH_AMALAN : MINALLAH_AMALAN.slice(0, 3)}
            soalan={isPro ? MINALLAH_SOALAN : MINALLAH_SOALAN.slice(0, 2)}
            doaArabic="رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"
            doaTranslation="Ya Tuhan kami, berikanlah kami kebaikan di dunia dan kebaikan di akhirat, dan peliharalah kami dari siksa api neraka"
            accentColor="#c9a96e"
            borderColor="#c9a96e25"
            bgColor="#c9a96e08"
          />
          {!isPro && (
            <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center space-y-2">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا
              </p>
              <p className="text-[#8a7a65] text-xs italic">"Dan orang-orang yang berjuang untuk Kami, nescaya Kami tunjukkan jalan-jalan Kami" — Al-Ankabut: 69</p>
              <p className="text-[#8a7a65] text-xs leading-relaxed mt-2">
                Tali hubungan anda dengan Allah sudah mula terbina.<br/>
                Tali yang sempurna memerlukan kedua-duanya.
              </p>
              <button onClick={() => setShowUpgradeModal(true)} className="w-full py-2.5 bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium rounded-xl hover:bg-[#c9a96e25] transition-colors mt-1">
                ✦ Buka Hablumminannas — Naik Taraf ke Pro
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'minannas' && isPro && (
        <HablumSection
          type="minannas"
          renungan={MINANNAS_RENUNGAN}
          amalan={MINANNAS_AMALAN}
          soalan={MINANNAS_SOALAN}
          doaArabic="اللَّهُمَّ أَصْلِحْ ذَاتَ بَيْنِنَا وَأَلِّفْ بَيْنَ قُلُوبِنَا وَاهْدِنَا سُبُلَ السَّلَامِ"
          doaTranslation="Ya Allah, perbaikilah perhubungan di antara kami, satukanlah hati kami, dan tunjukkanlah kami jalan-jalan keselamatan"
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
            Tali hubungan dengan manusia — amalan, refleksi, dan doa untuk orang-orang yang anda cintai.
          </p>
          <div className="bg-[#060d16] border border-[#f43f5e15] rounded-xl p-4 text-center">
            <p className="font-serif text-[#f43f5e] text-sm leading-loose" dir="rtl">
              وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">"Dan tolong-menolonglah dalam kebaikan dan ketakwaan" — Al-Maidah: 2</p>
          </div>
          <button className="w-full py-3 bg-[#f43f5e] text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
            ✦ Langkah ini ada lebih jauh...
          </button>
        </div>
      )}

      {showUpgradeModal && <HablumUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  )
}
