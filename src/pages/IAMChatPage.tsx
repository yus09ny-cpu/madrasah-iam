import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Lock, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { FREE_SYSTEM_PROMPT, PRO_SYSTEM_PROMPT } from '@/lib/systemPrompts'
import { sendIAMMessage } from '@/lib/iam-chat'
import { IAM_QUESTIONS } from '@/data/iam-questions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_LIMIT: Record<string, number> = { free: 5, pro: 50, family: 50 }

const OPENING_MSGS = [
  {
    arabic: null,
    text: 'Ada soalan tentang perjalanan rohani? Ada beban yang ingin dikongsi?\n\nSaya di sini.',
  },
  {
    arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
    text: 'Allah akan buka jalan untuk mereka yang mencari.\n\nApa yang membawa anda ke sini hari ini?',
  },
  {
    arabic: null,
    text: 'Ramai datang ke sini dengan soalan tentang zikir, tentang ketenangan, tentang Allah.\n\nSoalan mana yang ada dalam hati anda hari ini?',
  },
  {
    arabic: null,
    text: '1400 tahun dahulu, ada sahabat Nabi yang bertanya soalan yang sama seperti anda.\n\nApa soalan anda hari ini?',
  },
]

function pickRandomQuestions(count: number): string[] {
  return [...IAM_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, count)
}

// ─── API Call ─────────────────────────────────────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ─── CTA Detection ────────────────────────────────────────────────────────────

function hasCTA(content: string): boolean {
  return (
    content.includes('Langkah Seterusnya') ||
    content.includes('Hubungi Madrasah I AM') ||
    content.includes('wa.me/60182119135') ||
    content.includes('t.me/+7Bisf3e1')
  )
}

// ─── CTACard Component ────────────────────────────────────────────────────────

const TALQIN_MSG = `Assalamualaikum, saya dari app Madrasah I AM.

Saya telah mempelajari tentang Dzikir Jahar dan Dzikir Khafi melalui app ini dan ingin mendaftar sesi talqin.

Mohon bimbingan. Terima kasih.`

function CTACard() {
  const WA_LINK = `https://wa.me/60182119135?text=${encodeURIComponent(TALQIN_MSG)}`
  const TG_LINK = `https://t.me/+7Bisf3e1cd4xYTA9`
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(TALQIN_MSG)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3 mt-2"
      style={{
        background: 'linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(201,169,110,0.04) 100%)',
        border: '1px solid rgba(201,169,110,0.3)',
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="font-serif text-[#c9a96e]">✦</span>
        <p className="text-[#c9a96e] text-sm font-medium">Bersedia untuk melangkah?</p>
      </div>

      {/* WhatsApp — mesej pra-isi automatik */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[#c9a96e30] bg-[#c9a96e08] hover:bg-[#c9a96e15] transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📱</span>
          <span className="text-[#e8dcc8] text-sm font-medium">WhatsApp Madrasah I AM</span>
        </div>
        <ExternalLink size={13} className="text-[#8a7a65] group-hover:text-[#c9a96e] transition-colors" />
      </a>

      {/* Telegram — buka group + copy mesej */}
      <div className="space-y-1.5">
        <a
          href={TG_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[#c9a96e30] bg-[#c9a96e08] hover:bg-[#c9a96e15] transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">💬</span>
            <span className="text-[#e8dcc8] text-sm font-medium">Telegram Madrasah I AM</span>
          </div>
          <ExternalLink size={13} className="text-[#8a7a65] group-hover:text-[#c9a96e] transition-colors" />
        </a>

        {/* Copy mesej untuk Telegram */}
        <button
          onClick={handleCopy}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-[#1e2d40] hover:border-[#c9a96e30] transition-all group"
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-sm flex-shrink-0 mt-0.5">📋</span>
            <p className="text-[#8a7a65] text-xs leading-relaxed text-left truncate">
              {copied ? '✓ Mesej disalin — paste dalam Telegram' : 'Salin mesej untuk Telegram'}
            </p>
          </div>
          <span className={cn('text-xs flex-shrink-0 ml-2', copied ? 'text-emerald-400' : 'text-[#c9a96e]')}>
            {copied ? '✓' : 'Salin'}
          </span>
        </button>
      </div>

      <p className="text-[#8a7a65] text-[10px] text-center leading-relaxed">
        فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ — An-Nahl: 43
      </p>
    </div>
  )
}

// ─── RenunganModal Component ───────────────────────────────────────────────────

function RenunganModal({
  soalan,
  onTulis,
  onBincang,
  onClose,
}: {
  soalan: string
  onTulis: (teks: string) => void
  onBincang: () => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<'pilih' | 'tulis'>('pilih')
  const [teks, setTeks] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div
        className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 max-w-md w-full space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[#c9a96e] text-xs font-serif text-center">✦ Untuk Anda Renungkan</p>
        <p className="text-[#e8dcc8] text-base leading-relaxed text-center font-serif">{soalan}</p>

        {mode === 'pilih' ? (
          <div className="space-y-2">
            <p className="text-[#8a7a65] text-xs text-center leading-relaxed">
              Ambil masa sebentar untuk fikirkan soalan ini. Tiada jawapan betul atau salah.
            </p>
            <button onClick={() => setMode('tulis')}
              className="w-full py-3 bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] rounded-xl text-sm font-medium hover:bg-[#c9a96e25] transition-colors">
              ✍️ Tulis Renungan Saya
            </button>
            <button onClick={onBincang}
              className="w-full py-3 bg-transparent border border-[#1e2d40] text-[#e8dcc8] rounded-xl text-sm font-medium hover:border-[#c9a96e30] transition-colors">
              💬 Bincang dengan I AM
            </button>
            <button onClick={onClose}
              className="w-full py-2 text-[#8a7a65] text-xs hover:text-[#c9a96e] transition-colors">
              Tutup
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={teks}
              onChange={e => setTeks(e.target.value)}
              placeholder="Tulis apa yang terlintas di fikiran anda..."
              rows={5}
              autoFocus
              className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
            />
            <button onClick={() => onTulis(teks)} disabled={!teks.trim()}
              className="w-full py-3 bg-[#c9a96e] text-[#060d16] rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Simpan Renungan
            </button>
            <button onClick={() => setMode('pilih')}
              className="w-full py-2 text-[#8a7a65] text-xs hover:text-[#c9a96e] transition-colors">
              Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IAMChatPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const tier = user?.tier ?? 'free'
  const limit = DAILY_LIMIT[tier] ?? 5
  const isPro = tier === 'pro' || tier === 'family'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [usedToday, setUsedToday] = useState(0)
  const [openingIdx] = useState(() => Math.floor(Math.random() * OPENING_MSGS.length))
  const [starterQuestions] = useState(() => pickRandomQuestions(5))
  const [selectedSoalan, setSelectedSoalan] = useState<string | null>(null)
  const [renunganSaved, setRenunganSaved] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const systemPrompt = isPro ? PRO_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT
  const remaining = Math.max(0, limit - usedToday)
  const isLimitReached = usedToday >= limit
  const opening = OPENING_MSGS[openingIdx]

  // Load today's messages
  useEffect(() => {
    if (!user?.id) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const query = supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: true })

    Promise.resolve(query).then(({ data, error }) => {
      if (error || !data) return
      const msgs = data as Message[]
      setMessages(msgs)
      setUsedToday(msgs.filter(m => m.role === 'user').length)
    }).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Pastikan input kekal kelihatan apabila papan kekunci muncul di mobile
  useEffect(() => {
    function handleViewportResize() {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', handleViewportResize)
    return () => viewport?.removeEventListener('resize', handleViewportResize)
  }, [])

  const sendMessage = useCallback(async (text?: string, contextOverride?: string) => {
    const content = (text ?? input).trim()
    if (!content || isTyping || !user || isLimitReached) return

    // Semak semula terus dari Supabase (bukan state tempatan sahaja) sebelum
    // panggil API Anthropic — elak had harian dipintas bila pengguna buka
    // berbilang tab/peranti serentak (state tempatan boleh jadi lapuk).
    const today = format(new Date(), 'yyyy-MM-dd')
    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', `${today}T00:00:00`)

    if (count !== null && count >= limit) {
      setUsedToday(count)
      return
    }

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const tempId = `temp-${Date.now()}`
    const userMsg: Message = { id: tempId, role: 'user', content, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setUsedToday(n => n + 1)
    setIsTyping(true)

    // Save user message to Supabase in background — don't block API call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('chat_messages') as any)
      .insert({ user_id: user.id, role: 'user', content })
      .select().single()
      .then(({ data: saved }: { data: Message | null }) => {
        if (saved) setMessages(prev => prev.map(m => m.id === tempId ? saved : m))
      })
      .catch(() => {})

    try {
      // Build context and call API immediately — no waiting for Supabase
      const context = [...messages, userMsg]
        .slice(-8)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // Soalan renungan — hantar konteks khusus kepada AI tanpa mendedahkan
      // teks itu dalam gelembung mesej pengguna.
      if (contextOverride) {
        context[context.length - 1] = { role: 'user', content: contextOverride }
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      const reply = await sendIAMMessage(context, tier, systemPrompt, controller.signal, 'iam_chat')
      clearTimeout(timeoutId)

      // Show reply immediately in UI
      const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'assistant', content: reply, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])

      // Save assistant message in background
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('chat_messages') as any)
        .insert({ user_id: user.id, role: 'assistant', content: reply })
        .select().single()
        .then(({ data: savedReply }: { data: Message | null }) => {
          if (savedReply) setMessages(prev => prev.map(m => m.id === aiMsg.id ? savedReply : m))
        })
        .catch(() => {})
    } catch (err) {
      const errDetail = err instanceof Error ? err.message : 'Ralat tidak diketahui'
      // Jangan dedahkan ralat dalaman (cth. status bil/kredit Anthropic) kepada
      // pengguna — papar mesej mesra umum dan log butiran sebenar untuk admin.
      const isBillingError = /credit balance|billing|plans & billing/i.test(errDetail)
      if (isBillingError) console.error('[IAM] Billing/credit error (disembunyikan dari user):', errDetail)
      const userMessage = isBillingError
        ? 'Maaf, perkhidmatan I AM Chat sedang tidak tersedia buat masa ini. Sila cuba sebentar lagi.'
        : `Maaf, berlaku ralat: ${errDetail}\n\nSila cuba sekali lagi atau hubungi admin.`
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: userMessage,
        created_at: new Date().toISOString(),
      }])
    } finally {
      setIsTyping(false)
    }
  }, [input, isTyping, user, isLimitReached, messages, systemPrompt])

  const handleTulisRenungan = useCallback(async (teks: string) => {
    if (!selectedSoalan || !user) return
    setSelectedSoalan(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('renungan_entries') as any)
        .insert({ user_id: user.id, soalan: selectedSoalan, jawapan: teks })
      setRenunganSaved(true)
      setTimeout(() => setRenunganSaved(false), 3000)
    } catch {
      /* ignore — renungan tetap dalam fikiran user walaupun gagal simpan */
    }
  }, [selectedSoalan, user])

  const handleBincangRenungan = useCallback(() => {
    if (!selectedSoalan) return
    const soalan = selectedSoalan
    setSelectedSoalan(null)
    const context = `[KONTEKS: Ini adalah soalan renungan diri — user PILIH untuk bincang lanjut, bukan minta saya jawab soalan ini untuk mereka]\n\nSoalan renungan: ${soalan}\n\n(User akan tulis fikiran mereka selepas ini)`
    sendMessage(soalan, context)
  }, [selectedSoalan, sendMessage])

  return (
    <div className="flex flex-col max-w-2xl mx-auto" style={{ height: '100%', maxHeight: '100dvh' }}>

      {/* Header */}
      <div className="px-5 md:px-8 py-4 border-b border-[#1e2d40] flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
            <span className="font-serif text-[#c9a96e] text-lg">✦</span>
          </div>
          <div>
            <p className="font-serif text-[#c9a96e] font-medium">{t('iam.tajuk')} ✦</p>
            <p className="text-[#8a7a65] text-xs">{t('iam.sub')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#8a7a65]">{t('iam.had_free', { count: remaining })}</p>
          <p className="text-xs text-[#c9a96e]">
            {tier === 'free' ? t('iam.percuma') : tier === 'pro' ? t('iam.pro') : t('iam.keluarga')}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 space-y-4 min-h-0">

        {/* Opening + Starter (when no messages) */}
        {messages.length === 0 && !isTyping && (
          <div className="space-y-5 pt-2">
            {/* I AM opening */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="font-serif text-[#c9a96e] text-sm">✦</span>
              </div>
              <div className="space-y-2 flex-1">
                <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-[#8a7a65] text-xs mb-2">Assalamualaikum.</p>
                  {opening.arabic && (
                    <p className="font-serif text-[#c9a96e] text-base leading-loose mb-2" dir="rtl">
                      {opening.arabic}
                    </p>
                  )}
                  <p className="text-[#e8dcc8] text-sm leading-relaxed whitespace-pre-line">{opening.text}</p>
                </div>
              </div>
            </div>

            {/* Starter questions */}
            <div className="space-y-2">
              <p className="text-[#c9a96e] text-xs text-center font-serif">✦ Soalan untuk anda fikirkan:</p>
              <p className="text-[#8a7a65] text-[11px] text-center">Klik untuk renung soalan ini</p>
              {starterQuestions.map((q, i) => (
                <button key={i} onClick={() => setSelectedSoalan(q)}
                  className="w-full text-left px-4 py-3.5 bg-transparent border border-[#c9a96e4d] rounded-xl text-sm text-[#c9a96e] hover:bg-[#c9a96e1a] hover:border-[#c9a96e] transition-all leading-relaxed">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map(msg => (
          <div key={msg.id} className={cn(msg.role === 'user' ? 'flex items-end gap-2 justify-end' : 'space-y-1')}>
            <div className={cn('flex items-end gap-2', msg.role === 'user' ? '' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0 mb-0.5">
                <span className="font-serif text-[#c9a96e] text-xs">✦</span>
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-[#c9a96e20] border border-[#c9a96e30] text-[#e8dcc8] rounded-br-sm'
                : 'bg-[#0d1821] border border-[#1e2d40] text-[#e8dcc8] rounded-bl-sm'
            )}>
              {msg.content}
            </div>
            </div>
            {/* CTACard — muncul di bawah mesej assistant yang mengandungi CTA */}
            {msg.role === 'assistant' && hasCTA(msg.content) && (
              <div className="pl-9">
                <CTACard />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0 mb-0.5">
              <span className="font-serif text-[#c9a96e] text-xs">✦</span>
            </div>
            <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-5 md:px-8 py-4 border-t border-[#1e2d40] flex-shrink-0 space-y-3">

        {/* Limit reached — rohani message */}
        {isLimitReached ? (
          <div className="space-y-3">
            <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#c9a96e]" />
                <p className="text-[#c9a96e] font-medium text-sm">✦ {limit} perbualan hari ini selesai.</p>
              </div>
              <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center">
                <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                  أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
                </p>
                <p className="text-[#8a7a65] text-xs mt-1.5 leading-relaxed italic">
                  Hati yang tenang tidak datang dari perbualan sahaja — ia datang dari amalan.
                </p>
              </div>
              <p className="text-[#8a7a65] text-xs text-center leading-relaxed">
                Cuba Zikir Am hari ini. Ia percuma dan ia bermula dari langkah pertama yang kecil. Kita sambung esok. InsyaAllah. 🌙
              </p>
              <button onClick={() => navigate('/zikir')}
                className="w-full py-3 bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] rounded-xl text-sm font-medium hover:bg-[#c9a96e25] transition-colors">
                📿 Cuba Zikir Am Sekarang
              </button>
              {!isPro && (
                <p className="text-[#8a7a65] text-xs text-center">
                  Atau dapatkan 50 perbualan/hari dengan Pro ✦
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder={t('iam.placeholder')}
              rows={1}
              className="flex-1 bg-[#0d1821] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-2xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
              style={{ maxHeight: '120px' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ backgroundColor: input.trim() && !isTyping ? '#c9a96e' : '#1e2d40' }}>
              {isTyping
                ? <Loader2 size={16} className="animate-spin" style={{ color: '#8a7a65' }} />
                : <Send size={16} style={{ color: input.trim() ? '#060d16' : '#8a7a65' }} />
              }
            </button>
          </div>
        )}
      </div>

      {/* Toast — renungan disimpan */}
      {renunganSaved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0d1821] border border-[#c9a96e40] rounded-xl px-4 py-2.5 text-[#c9a96e] text-xs shadow-lg">
          ✓ Renungan anda telah disimpan
        </div>
      )}

      {/* Modal soalan renungan */}
      {selectedSoalan && (
        <RenunganModal
          soalan={selectedSoalan}
          onTulis={handleTulisRenungan}
          onBincang={handleBincangRenungan}
          onClose={() => setSelectedSoalan(null)}
        />
      )}
    </div>
  )
}
