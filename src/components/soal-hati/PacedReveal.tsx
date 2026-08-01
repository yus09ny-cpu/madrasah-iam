import { useEffect, useRef, useState } from 'react'
import { ChoiceButtons } from './ChoiceButtons'
import { interpolateNama, type SoalHatiBeat } from '@/data/soalHatiContent'

// Enjin timed-reveal untuk "Soal Hati" — belum ada padanan sedia ada dalam
// codebase (tiada audio/video sebenar setakat Fasa 1). Teks setiap beat
// dipaparkan berperingkat (jeda dikira dari panjang baris), bertindak macam
// transkrip dialog yang berkembang — checkpoint (MCQ) muncul sebagai blok
// aktif dalam transkrip yang sama, dijawab, kemudian jujukan sambung.
//
// Ketik mana-mana bahagian transkrip untuk langkau jeda baris semasa.

type TranscriptItem =
  | { kind: 'line'; key: string; text: string }
  | { kind: 'visual'; key: string; emoji: string }
  | { kind: 'answered'; key: string; label: string; ackText?: string }

type CheckpointBeat = Extract<SoalHatiBeat, { kind: 'checkpoint' }>
type ChapterEndBeat = Extract<SoalHatiBeat, { kind: 'chapterEnd' }>

// Omit built-in tak distribute atas union — perlu versi distributive supaya
// appendItem() kekal terima union TranscriptItem yang betul (bukan collapse).
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never

function computeDelayMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.min(4200, Math.max(900, 600 + words * 180))
}

export default function PacedReveal({
  chapterKey,
  beats,
  nama,
  initialBeatIndex = 0,
  initialAnswers,
  onProgress,
  onChapterEnd,
  accent = '#7dd3a8',
}: {
  chapterKey: string
  beats: SoalHatiBeat[]
  nama: string
  initialBeatIndex?: number
  initialAnswers?: Record<string, string>
  onProgress: (beatIndex: number, answers: Record<string, string>, completed: boolean) => void
  onChapterEnd: (action: 'next-chapter' | 'exit' | 'save-and-exit') => void
  accent?: string
}) {
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointBeat | null>(null)
  const [activeChapterEnd, setActiveChapterEnd] = useState<ChapterEndBeat | null>(null)
  const [isPending, setIsPending] = useState(false)

  const answersRef = useRef<Record<string, string>>({})
  const cursorRef = useRef(0)
  // Penjana generasi (bukan boolean cancelled) — React StrictMode (dev)
  // sengaja jalankan effect dua kali (setup→cleanup→setup) secara segerak
  // sebelum promise pertama sempat selesai. Boolean cancelled tunggal akan
  // di-reset semula oleh setup KEDUA, jadi loop async PERTAMA yang sepatutnya
  // dibatalkan akan lulus semakannya semula (punca baris terpapar berganda).
  // Nombor generasi elak ini — setiap run() ikat kepada generasi semasa dia
  // dimulakan, bukan flag global yang boleh di-"un-cancel" oleh setup lain.
  const generationRef = useRef(0)
  const skipRef = useRef<(() => void) | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const itemCounter = useRef(0)

  function appendItem(item: DistributiveOmit<TranscriptItem, 'key'>) {
    itemCounter.current += 1
    // Kunci dinamakan-ruang dengan generasi semasa — bukan sekadar kiraan
    // tunggal. Semasa "instant fast-forward" (resume, initialBeatIndex > 0),
    // run() boleh proses banyak beat serentak secara segerak (tiada await
    // sehingga sampai titik resume), jadi StrictMode punya setup→cleanup→setup
    // boleh berlaku SEBELUM sesiapa sempat "yield" — dua generasi berbeza
    // boleh masing-masing appendItem dgn itemCounter bermula dari 1 semula.
    // Awalan generasi elak kunci "1", "2"... berlanggar antara generasi tu.
    const key = `${generationRef.current}-${itemCounter.current}`
    setTranscript(prev => [...prev, { ...item, key } as TranscriptItem])
  }

  function waitPaced(text: string): Promise<void> {
    return new Promise(resolve => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        window.clearTimeout(timer)
        skipRef.current = null
        setIsPending(false)
        resolve()
      }
      setIsPending(true)
      const timer = window.setTimeout(finish, computeDelayMs(text))
      skipRef.current = finish
    })
  }

  async function run(startIndex: number, resumeIndex: number, gen: number) {
    let index = startIndex
    while (index < beats.length) {
      if (generationRef.current !== gen) return
      const beat = beats[index]
      const instant = index < resumeIndex

      if (beat.kind === 'narration') {
        if (beat.visual) appendItem({ kind: 'visual', emoji: beat.visual })
        for (const line of beat.lines) {
          if (generationRef.current !== gen) return
          if (!instant) await waitPaced(line)
          if (generationRef.current !== gen) return
          appendItem({ kind: 'line', text: interpolateNama(line, nama) })
        }
        index++
        continue
      }

      if (beat.kind === 'gated') {
        if (answersRef.current[beat.afterCheckpoint] === beat.whenOptionId) {
          for (const line of beat.lines) {
            if (generationRef.current !== gen) return
            if (!instant) await waitPaced(line)
            if (generationRef.current !== gen) return
            appendItem({ kind: 'line', text: interpolateNama(line, nama) })
          }
        }
        index++
        continue
      }

      if (beat.kind === 'checkpoint') {
        const existing = answersRef.current[beat.id]
        if (instant && existing) {
          const opt = beat.options.find(o => o.id === existing)
          appendItem({
            kind: 'answered',
            label: opt?.label ?? existing,
            ackText: opt?.ackText ? interpolateNama(opt.ackText, nama) : undefined,
          })
          index++
          continue
        }
        cursorRef.current = index
        setActiveCheckpoint(beat)
        return
      }

      if (beat.kind === 'chapterEnd') {
        cursorRef.current = index
        setActiveChapterEnd(beat)
        onProgress(index, answersRef.current, true)
        return
      }
    }
  }

  useEffect(() => {
    const gen = ++generationRef.current
    answersRef.current = { ...(initialAnswers ?? {}) }
    cursorRef.current = initialBeatIndex
    itemCounter.current = 0
    setTranscript([])
    setActiveCheckpoint(null)
    setActiveChapterEnd(null)
    setIsPending(false)
    run(0, initialBeatIndex, gen)
    return () => {
      generationRef.current++
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript, activeCheckpoint, activeChapterEnd])

  function handleTapSkip() {
    skipRef.current?.()
  }

  function handleSelectCheckpoint(optionId: string) {
    if (!activeCheckpoint) return
    const opt = activeCheckpoint.options.find(o => o.id === optionId)
    if (!opt) return

    const nextAnswers = { ...answersRef.current, [activeCheckpoint.id]: optionId }
    answersRef.current = nextAnswers
    appendItem({
      kind: 'answered',
      label: opt.label,
      ackText: opt.ackText ? interpolateNama(opt.ackText, nama) : undefined,
    })

    const nextIndex = opt.loopBack ? cursorRef.current : cursorRef.current + 1
    setActiveCheckpoint(null)
    onProgress(nextIndex, nextAnswers, false)
    run(nextIndex, nextIndex, generationRef.current)
  }

  function handleSelectChapterEnd(optionId: string) {
    if (!activeChapterEnd) return
    const opt = activeChapterEnd.options.find(o => o.id === optionId)
    if (!opt) return
    onChapterEnd(opt.action)
  }

  return (
    <div className="space-y-5">
      <div onClick={handleTapSkip} className="space-y-3.5 cursor-default">
        {transcript.map(item => {
          if (item.kind === 'visual') {
            return (
              <div key={item.key} className="text-3xl text-center py-1" aria-hidden="true">
                {item.emoji}
              </div>
            )
          }
          if (item.kind === 'answered') {
            return (
              <div key={item.key} className="flex flex-col items-end gap-1.5">
                <span
                  className="px-3.5 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}
                >
                  {item.label}
                </span>
                {item.ackText && (
                  <p className="text-[#8a7a65] text-xs italic pr-1">{item.ackText}</p>
                )}
              </div>
            )
          }
          return (
            <p key={item.key} className="text-[#e8dcc8] text-sm leading-relaxed whitespace-pre-line">
              {item.text}
            </p>
          )
        })}

        {isPending && (
          <div className="flex items-center gap-1.5 py-1" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8a7a65] animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#8a7a65] animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#8a7a65] animate-pulse [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {isPending && (
        <p className="text-center text-[#8a7a65] text-[11px]">Ketik untuk teruskan dengan segera</p>
      )}

      {activeCheckpoint && (
        <ChoiceButtons
          options={activeCheckpoint.options}
          onSelect={handleSelectCheckpoint}
          accent={accent}
        />
      )}

      {activeChapterEnd && (
        <div className="space-y-2 pt-2">
          {activeChapterEnd.options.map((opt, idx) => (
            <button
              key={opt.id}
              onClick={() => handleSelectChapterEnd(opt.id)}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
              style={
                idx === 0
                  ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: '#060d16' }
                  : { border: '1px solid #1e2d40', color: '#8a7a65', backgroundColor: 'transparent' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
