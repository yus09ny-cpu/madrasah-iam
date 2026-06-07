import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { CheckCircle2, RefreshCw, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useTodayMuhasabah, useSaveMuhasabah } from '@/hooks/useMuhasabah'
import { selectAuditQuestions, type AuditQuestion } from '@/data/audit-jiwa-questions'
import { sendIAMMessage } from '@/lib/iam-chat'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_KEYS = [
  { value: 1, emoji: '😔', key: 'mood_berat' },
  { value: 2, emoji: '😕', key: 'mood_sedih' },
  { value: 3, emoji: '😐', key: 'mood_biasa' },
  { value: 4, emoji: '🙂', key: 'mood_baik' },
  { value: 5, emoji: '😊', key: 'mood_syukur' },
]

const TUJUAN_COLOR: Record<string, string> = {
  dedah_syaitan: '#f87171',
  dedah_nafsu: '#a78bfa',
  tunjuk_jalan: '#c9a96e',
  untuk_baru: '#7dd3a8',
  untuk_kembali: '#7dd3a8',
}

const AUDIT_AI_PROMPT = `Kamu adalah sistem Audit Jiwa Madrasah I AM.

Pengguna telah menjawab soalan Audit Jiwa. Berdasarkan soalan dan jawapan mereka, kenalpasti sama ada:
1. Ini menunjukkan kesan SYAITAN (serangan dari luar — gangguan fikiran, lalai, tergesa-gesa) → hubungkan dengan Al-A'raf: 17
2. ATAU ini menunjukkan pengaruh NAFSU (dari dalam — malas, puas dengan minimum, cintakan dunia) → hubungkan dengan Yusuf: 53

BAHASA: Bahasa Melayu Malaysia standard. BUKAN Bahasa Indonesia.

FORMAT RESPONS (3-4 perenggan pendek):
1. Empati — tunjukkan anda faham pengalaman mereka
2. Kenalpasti penghalang (syaitan ATAU nafsu) dengan ayat Al-Quran yang berkaitan
3. Tegaskan: "Ini bukan kelemahan anda — ini adalah serangan yang Allah sudah amaran tentangnya"
4. Akhiri dengan: "Dan Allah sudah berikan bentengnya..."

PENTING: Jangan sebut "AI" — kamu adalah "I AM". Jangan mengarang dalil.`

const DEFAULT_REFLECTION = `Alhamdulillah kerana anda meluangkan masa untuk Audit Jiwa hari ini.

وَلَذِكْرُ اللَّهِ أَكْبَرُ
"Dan sesungguhnya zikir kepada Allah adalah pekerjaan yang paling agung" — Al-Ankabut: 45

Setiap soalan yang anda jawab adalah langkah untuk mengenal 2 penghalang utama dalam perjalanan anda.

Syaitan dari luar — datang dari depan, belakang, kanan dan kiri. (Al-A'raf: 17)

Nafsu dari dalam — sentiasa mengajak kepada kejahatan. (Yusuf: 53)

Ubat untuk kedua-duanya sudah Allah sediakan — melalui Zikir Jahar dan Zikir Khafi.

Mahu tahu lebih lanjut? Klik tab Zikir Khas.`

const TIMEOUT_MS = 8000

// ─── Types ────────────────────────────────────────────────────────────────────

type PagePhase = 'answering' | 'ai-loading' | 'result' | 'done'

// ─── Question Card ────────────────────────────────────────────────────────────

function AuditCard({
  index,
  q,
  mainValue,
  ikutanValue,
  onMainChange,
  onIkutanChange,
  disabled,
}: {
  index: number
  q: AuditQuestion
  mainValue: string
  ikutanValue: string
  onMainChange: (v: string) => void
  onIkutanChange: (v: string) => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const dot = TUJUAN_COLOR[q.tujuan] ?? '#c9a96e'
  const showIkutan = mainValue.trim().length >= 15 && !!q.ikutan
  const soalan = t(`audit_soalan.${q.id}.soalan`, { defaultValue: q.soalan })
  const ikutan = q.ikutan ? t(`audit_soalan.${q.id}.ikutan`, { defaultValue: q.ikutan }) : undefined

  return (
    <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
      {/* Number + tujuan dot */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#060d16]"
          style={{ backgroundColor: dot }}>
          {index + 1}
        </div>
        <p className="text-[#8a7a65] text-xs">
          {t(`audit_jiwa.${q.tujuan}`)}
        </p>
      </div>

      {/* Main question */}
      <p className="text-[#e8dcc8] text-sm leading-relaxed font-medium">{soalan}</p>

      <textarea
        value={mainValue}
        onChange={e => onMainChange(e.target.value)}
        disabled={disabled}
        placeholder={t('audit_jiwa.jawapan')}
        rows={3}
        className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e40] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors disabled:opacity-60"
      />

      {/* Ikutan — muncul selepas ada jawapan */}
      {showIkutan && (
        <div className="space-y-2 pt-1 border-t border-[#1e2d40]">
          <p className="text-[#8a7a65] text-xs italic pt-2">"{ikutan}"</p>
          <textarea
            value={ikutanValue}
            onChange={e => onIkutanChange(e.target.value)}
            disabled={disabled}
            placeholder={t('umum.teruskan_refleksi') || 'Teruskan refleksi anda...'}
            rows={2}
            className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e40] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors disabled:opacity-60"
          />
        </div>
      )}
    </div>
  )
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({
  aiResponse,
  onNavigate,
}: {
  aiResponse: string
  onNavigate: (path: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      {/* AI Response */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
            <span className="font-serif text-[#c9a96e] text-sm">✦</span>
          </div>
          <p className="text-[#c9a96e] text-sm font-medium">{t('audit_jiwa.refleksi_iam')}</p>
        </div>
        <p className="text-[#e8dcc8] text-sm leading-relaxed whitespace-pre-line">{aiResponse}</p>
      </div>

      {/* Penutup */}
      <div className="bg-[#060d16] border border-[#c9a96e20] rounded-2xl p-6 text-center space-y-3">
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
          وَلَذِكْرُ اللَّهِ أَكْبَرُ
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">
          "Dan sesungguhnya zikir kepada Allah adalah pekerjaan yang paling agung" — Al-Ankabut: 45
        </p>
        <div className="h-px bg-[#1e2d40]" />
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          {t('audit_jiwa.audit_baru')}
        </p>
        <p className="text-[#c9a96e] text-sm font-medium">{t('audit_jiwa.mahu_tahu')}</p>
      </div>

      {/* CTA */}
      <button
        onClick={() => onNavigate('/zikir?tab=khas')}
        className="w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
      >
        {t('audit_jiwa.ya_tunjukkan')}
      </button>
      <button
        onClick={() => onNavigate('/solat')}
        className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#c9a96e30] transition-all"
      >
        {t('umum.kembali')}
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MuhasabahPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data: existing, isFetching } = useTodayMuhasabah()
  const { mutate: saveInBackground } = useSaveMuhasabah()
  const isPro = user?.tier === 'pro' || user?.tier === 'family'

  const [phase, setPhase] = useState<PagePhase>('answering')
  const [mood, setMood] = useState<number>(3)
  const [mainAnswers, setMainAnswers] = useState<Record<string, string>>({})
  const [ikutanAnswers, setIkutanAnswers] = useState<Record<string, string>>({})
  const [aiResponse, setAiResponse] = useState('')
  const [saveError, setSaveError] = useState('')
  const [loadingSeconds, setLoadingSeconds] = useState(0)
  const pendingContext = useRef('')

  // Calculate day count from user registration
  const dayCount = useMemo(() => {
    if (!user?.created_at) return 1
    return Math.max(1, Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)))
  }, [user?.created_at])

  // Select today's questions (same questions all day — deterministic)
  const selectedQuestions = useMemo(
    () => selectAuditQuestions(dayCount, mood, isPro),
    [dayCount, isPro] // intentionally not re-selecting when mood changes mid-session
  )

  // Load existing data if already done today
  useEffect(() => {
    if (existing) {
      if (existing.mood) setMood(existing.mood)
      // Pre-fill answers from saved data
      if (Array.isArray(existing.answers)) {
        const main: Record<string, string> = {}
        const ikutan: Record<string, string> = {}
        existing.answers.forEach((a: { question_id: string | number; answer: string }) => {
          const id = String(a.question_id)
          if (id.endsWith('_iku')) {
            ikutan[id.replace('_iku', '')] = a.answer
          } else {
            main[id] = a.answer
          }
        })
        setMainAnswers(main)
        setIkutanAnswers(ikutan)
      }
      setPhase('done')
    }
  }, [existing])

  const filledCount = selectedQuestions.filter(q => mainAnswers[q.id]?.trim().length > 0).length
  const canSave = filledCount > 0 && phase === 'answering'

  // Loading timer
  useEffect(() => {
    if (phase !== 'ai-loading') { setLoadingSeconds(0); return }
    const t = setInterval(() => setLoadingSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Safety net — keluar dari loading selepas 10s walaupun API gagal
  useEffect(() => {
    if (phase !== 'ai-loading') return
    const t = setTimeout(() => {
      setAiResponse(DEFAULT_REFLECTION)
      setPhase('result')
    }, 10000)
    return () => clearTimeout(t)
  }, [phase])

  const requestReflection = useCallback(async (context: string) => {
    const tier = user?.tier ?? 'free'
    const controller = new AbortController()
    const timeoutPromise = new Promise<string>(resolve =>
      setTimeout(() => { controller.abort(); resolve(DEFAULT_REFLECTION) }, TIMEOUT_MS)
    )
    const aiPromise = sendIAMMessage(
      [{ role: 'user', content: `Audit Jiwa saya hari ini:\n\n${context}` }],
      tier,
      AUDIT_AI_PROMPT,
      controller.signal
    ).catch(() => DEFAULT_REFLECTION)

    const reply = await Promise.race([aiPromise, timeoutPromise])
    setAiResponse(reply)
    setPhase('result')
  }, [user?.tier])

  function useDefaultReflection() {
    setAiResponse(DEFAULT_REFLECTION)
    setPhase('result')
  }

  async function handleRetry() {
    setLoadingSeconds(0)
    await requestReflection(pendingContext.current)
  }

  async function handleSave() {
    setSaveError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answerList: any[] = selectedQuestions.flatMap(q => {
      const entries = [{ question_id: q.id, question: q.soalan, answer: mainAnswers[q.id] ?? '' }]
      if (q.ikutan && ikutanAnswers[q.id]?.trim()) {
        entries.push({ question_id: `${q.id}_iku`, question: q.ikutan, answer: ikutanAnswers[q.id] })
      }
      return entries
    })

    // Save jalan background — tidak perlu tunggu
    saveInBackground({ answers: answerList, mood: mood as 1 | 2 | 3 | 4 | 5 })

    const context = selectedQuestions.map(q => {
      let txt = `Soalan: ${q.soalan}\nJawapan: ${mainAnswers[q.id] || '(tiada jawapan)'}`
      if (q.ikutan && ikutanAnswers[q.id]?.trim()) {
        txt += `\n\nSoalan susulan: ${q.ikutan}\nJawapan: ${ikutanAnswers[q.id]}`
      }
      return txt
    }).join('\n\n---\n\n')

    pendingContext.current = context
    setPhase('ai-loading')
    await requestReflection(context)
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-3xl text-[#c9a96e] leading-none">مُحَاسَبَة</p>
          <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('audit_jiwa.tajuk')}</h1>
          <p className="text-[#8a7a65] text-sm mt-0.5">
            {phase === 'done'
              ? t('audit_jiwa.selesai')
              : t('audit_jiwa.sub')}
          </p>
        </div>
        {isFetching && <RefreshCw size={16} className="text-[#8a7a65] animate-spin mt-2 flex-shrink-0" />}
      </div>

      {/* I AM Loading */}
      {phase === 'ai-loading' && (
        <div className="flex flex-col items-center justify-center py-10 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
            <span className="font-serif text-[#c9a96e] text-2xl">✦</span>
          </div>
          <div className="text-center space-y-3">
            <p className="text-[#c9a96e] text-sm font-medium">{t('audit_jiwa.loading')}</p>
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
              أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
            </p>
            <div className="flex gap-1.5 justify-center">
              <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
          {loadingSeconds >= 3 && (
            <p className="text-[#8a7a65] text-xs text-center leading-relaxed">
              Mengambil masa sedikit... Terima kasih atas kesabaran anda.
            </p>
          )}
          {loadingSeconds >= 5 && (
            <div className="w-full space-y-2">
              <button onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#c9a96e40] text-[#c9a96e] text-sm hover:bg-[#c9a96e10] transition-colors">
                <RotateCcw size={14} /> {t('umum.cuba_semula')}
              </button>
              <button onClick={useDefaultReflection}
                className="w-full py-3 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
                {t('audit_jiwa.gunakan_lalai')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result Screen */}
      {phase === 'result' && (
        <ResultScreen aiResponse={aiResponse} onNavigate={navigate} />
      )}

      {/* Done today */}
      {phase === 'done' && (
        <div className="space-y-5">
          <div className="flex items-center justify-center gap-3 py-5 bg-[#0d1821] border border-[#c9a96e30] rounded-2xl">
            <CheckCircle2 size={22} className="text-[#c9a96e]" />
            <p className="text-[#c9a96e] font-medium font-serif">{t('audit_jiwa.selesai')}</p>
          </div>
          {/* Show saved answers */}
          {selectedQuestions.length > 0 && (
            <div className="space-y-3">
              {selectedQuestions.map((q, i) => (
                <AuditCard
                  key={q.id}
                  index={i}
                  q={q}
                  mainValue={mainAnswers[q.id] ?? ''}
                  ikutanValue={ikutanAnswers[q.id] ?? ''}
                  onMainChange={() => {}}
                  onIkutanChange={() => {}}
                  disabled
                />
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/zikir')}
            className="w-full py-3.5 rounded-2xl text-sm font-medium bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] hover:bg-[#c9a96e25] transition-colors"
          >
            {t('audit_jiwa.pelajari_zikir')}
          </button>
        </div>
      )}

      {/* Answering phase */}
      {phase === 'answering' && (
        <>
          {/* Progress */}
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-sm text-[#e8dcc8]">{t('audit_jiwa.kemajuan')}</span>
              <span className="text-sm font-medium text-[#c9a96e]">{filledCount}/{selectedQuestions.length} soalan</span>
            </div>
            <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
              <div className="h-full bg-[#c9a96e] rounded-full transition-all duration-500"
                style={{ width: `${selectedQuestions.length > 0 ? (filledCount / selectedQuestions.length) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Mood */}
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5">
            <p className="text-sm text-[#8a7a65] mb-3">{t('audit_jiwa.mood')}</p>
            <div className="flex gap-2">
              {MOOD_KEYS.map(m => (
                <button key={m.value} onClick={() => setMood(m.value)}
                  className={cn('flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200',
                    mood === m.value ? 'border-[#c9a96e] bg-[#c9a96e15]' : 'border-[#1e2d40] hover:border-[#2a3d55]')}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] text-[#8a7a65]">{t(`audit_jiwa.${m.key}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Context hint */}
          <div className="flex items-start gap-3 px-1">
            <div className="flex gap-2 flex-wrap">
              {[
                { color: '#f87171', label: t('audit_jiwa.dedah_syaitan') },
                { color: '#a78bfa', label: t('audit_jiwa.dedah_nafsu') },
                { color: '#c9a96e', label: t('audit_jiwa.tunjuk_jalan') },
                { color: '#7dd3a8', label: t('audit_jiwa.untuk_baru') },
              ].map(hint => (
                <div key={hint.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hint.color }} />
                  <span className="text-[#8a7a65] text-xs">{hint.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {selectedQuestions.map((q, i) => (
              <AuditCard
                key={q.id}
                index={i}
                q={q}
                mainValue={mainAnswers[q.id] ?? ''}
                ikutanValue={ikutanAnswers[q.id] ?? ''}
                onMainChange={v => setMainAnswers(prev => ({ ...prev, [q.id]: v }))}
                onIkutanChange={v => setIkutanAnswers(prev => ({ ...prev, [q.id]: v }))}
                disabled={false}
              />
            ))}
          </div>

          {/* Error */}
          {saveError && (
            <div className="px-4 py-3 bg-red-900/20 border border-red-900/40 rounded-xl text-red-400 text-sm">
              {saveError}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] active:bg-[#a07840] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {t('audit_jiwa.simpan')}
          </button>
        </>
      )}
    </div>
  )
}
