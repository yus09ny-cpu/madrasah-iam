import { useState, useCallback } from 'react'
import { CheckCircle2, RotateCcw, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useRumiMode } from '@/pages/NotificationSettingsPage'
import { KHATAMAN_DZIKIR, type KhatamanEntry } from '@/data/khatamanDzikir'

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'madrasah-khataman'

function getTodayKey() {
  return `${STORAGE_KEY_PREFIX}-${format(new Date(), 'yyyy-MM-dd')}`
}

function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(getTodayKey())
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function persistProgress(progress: Record<string, number>) {
  try { localStorage.setItem(getTodayKey(), JSON.stringify(progress)) } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRACKABLE = KHATAMAN_DZIKIR.filter(e => e.type !== 'header')

function targetOf(entry: KhatamanEntry): number {
  if (entry.repeatSets && entry.repeatPerSet) return entry.repeatSets * entry.repeatPerSet
  return 1 // simple "tandakan selesai" entries (dzikir tanpa ulangan, atau instruction)
}

function isEntryDone(entry: KhatamanEntry, value: number): boolean {
  return value >= targetOf(entry)
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ entry }: { entry: KhatamanEntry }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <div className="h-px flex-1 bg-[#c9a96e30]" />
      <div className="text-center">
        {entry.headerArabic && (
          <p className="font-serif text-[#c9a96e] text-lg leading-tight" dir="rtl">{entry.headerArabic}</p>
        )}
        <p className="text-[#c9a96e] text-xs font-medium uppercase tracking-wider">{entry.headerText}</p>
      </div>
      <div className="h-px flex-1 bg-[#c9a96e30]" />
    </div>
  )
}

// ─── Instruction Card ─────────────────────────────────────────────────────────

function InstructionCard({ entry, done, onToggle }: { entry: KhatamanEntry; done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all',
        done ? 'border-[#4ade8040] bg-[#4ade8010]' : 'border-[#1e2d40] bg-[#0d1821] hover:border-[#c9a96e30]'
      )}
    >
      {done ? <CheckCircle2 size={18} className="text-[#4ade80] flex-shrink-0" /> : <Circle size={18} className="text-[#8a7a65] flex-shrink-0" />}
      <p className={cn('text-sm italic', done ? 'text-[#4ade80]' : 'text-[#8a7a65]')}>{entry.instructionText}</p>
    </button>
  )
}

// ─── Dzikir Card (tanpa ulangan — Fatihah dedication / Tawajjuh paragraf) ─────

function SimpleDzikirCard({ entry, done, onToggle, showRumi }: {
  entry: KhatamanEntry; done: boolean; onToggle: () => void; showRumi: boolean
}) {
  return (
    <div className={cn('rounded-2xl border p-5 space-y-3 transition-colors', done ? 'border-[#c9a96e30] bg-[#c9a96e08]' : 'border-[#1e2d40] bg-[#0d1821]')}>
      {entry.arabic && (
        <p className="text-right leading-loose whitespace-pre-line" dir="rtl" style={{ color: '#c9a96e', fontFamily: '"Lora", serif', fontSize: 18, lineHeight: 2 }}>
          {entry.arabic}
        </p>
      )}
      {showRumi && entry.transliteration && (
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">{entry.transliteration}</p>
      )}
      {entry.translation && (
        <p className="text-[#e8dcc8] text-xs leading-relaxed">{entry.translation}</p>
      )}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all',
          done ? 'border-[#4ade8040] bg-[#4ade8015] text-[#4ade80]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#c9a96e30] hover:text-[#e8dcc8]'
        )}
      >
        {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        {done ? 'Selesai dibaca' : 'Tandakan selesai'}
      </button>
    </div>
  )
}

// ─── Dzikir Card (dengan ulangan — tap counter) ───────────────────────────────

function CounterDzikirCard({ entry, count, onTap, onReset, showRumi }: {
  entry: KhatamanEntry; count: number; onTap: (n: number) => void; onReset: () => void; showRumi: boolean
}) {
  const repeatSets = entry.repeatSets ?? 1
  const repeatPerSet = entry.repeatPerSet ?? 1
  const target = repeatSets * repeatPerSet
  const isDone = count >= target
  const currentSet = isDone ? repeatSets : Math.min(repeatSets, Math.floor(count / repeatPerSet) + 1)
  const countInSet = isDone ? repeatPerSet : count - (currentSet - 1) * repeatPerSet
  const progress = Math.min((count / target) * 100, 100)
  const [flash, setFlash] = useState(false)
  const bigTarget = target > 200

  const handleTap = useCallback((n: number) => {
    if (isDone) return
    onTap(n)
    setFlash(true)
    setTimeout(() => setFlash(false), 90)
  }, [isDone, onTap])

  return (
    <div className={cn('rounded-2xl border p-5 space-y-3 transition-colors', isDone ? 'border-[#4ade8030] bg-[#4ade8008]' : 'border-[#1e2d40] bg-[#0d1821]')}>
      {entry.arabic && (
        <p className="text-right leading-loose whitespace-pre-line" dir="rtl" style={{ color: '#c9a96e', fontFamily: '"Lora", serif', fontSize: 20, lineHeight: 2.1 }}>
          {entry.arabic}
        </p>
      )}
      {showRumi && entry.transliteration && (
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">{entry.transliteration}</p>
      )}
      {entry.translation && (
        <p className="text-[#e8dcc8] text-xs leading-relaxed">{entry.translation}</p>
      )}

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-[#8a7a65]">
            {repeatSets > 1 ? `Set ${currentSet}/${repeatSets} · ${countInSet}/${repeatPerSet}` : `${count}/${repeatPerSet}`}
          </span>
          <span className="font-medium" style={{ color: isDone ? '#4ade80' : '#c9a96e' }}>
            {count.toLocaleString()} / {target.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: isDone ? '#4ade80' : '#c9a96e' }} />
        </div>
      </div>

      {isDone ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <CheckCircle2 size={18} className="text-[#4ade80]" />
          <p className="text-[#4ade80] text-sm font-serif">Selesai — {target.toLocaleString()}×</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => handleTap(1)}
            className={cn(
              'w-full py-4 rounded-xl border-2 select-none transition-transform duration-75 flex items-center justify-center gap-2',
              flash ? 'scale-[0.98] border-[#e2c89a] bg-[#c9a96e15]' : 'border-[#c9a96e40] bg-[#c9a96e08] hover:bg-[#c9a96e12]'
            )}
          >
            <span className="text-2xl font-bold text-[#e8dcc8]">{count.toLocaleString()}</span>
            <span className="text-[10px] text-[#c9a96e] uppercase tracking-widest">Ketuk</span>
          </button>
          {bigTarget && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleTap(10)} className="py-2.5 rounded-xl border border-[#1e2d40] text-xs text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors">+10</button>
              <button onClick={() => handleTap(100)} className="py-2.5 rounded-xl border border-[#1e2d40] text-xs text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors">+100</button>
            </div>
          )}
        </div>
      )}

      {count > 0 && (
        <div className="flex justify-center">
          <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
            <RotateCcw size={11} />
            Set semula
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KhatamanDzikirTQN() {
  const { showRumi } = useRumiMode()
  const [progress, setProgress] = useState<Record<string, number>>(loadProgress)

  const doneCount = TRACKABLE.filter(e => isEntryDone(e, progress[e.id] ?? 0)).length
  const overallPct = Math.round((doneCount / TRACKABLE.length) * 100)

  function updateEntry(id: string, value: number) {
    setProgress(prev => {
      const next = { ...prev, [id]: value }
      persistProgress(next)
      return next
    })
  }

  function handleAdd(entry: KhatamanEntry, n: number) {
    const target = targetOf(entry)
    const current = progress[entry.id] ?? 0
    updateEntry(entry.id, Math.min(current + n, target))
  }

  function handleToggle(entry: KhatamanEntry) {
    const current = progress[entry.id] ?? 0
    updateEntry(entry.id, current > 0 ? 0 : 1)
  }

  function handleResetEntry(id: string) {
    updateEntry(id, 0)
  }

  function handleResetAll() {
    if (!confirm('Set semula seluruh kemajuan Khataman hari ini?')) return
    setProgress({})
    persistProgress({})
  }

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-4 space-y-2 sticky top-2 z-10 backdrop-blur">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8a7a65]">Kemajuan Khataman</span>
          <span className="font-medium text-[#c9a96e]">{doneCount}/{TRACKABLE.length} ({overallPct}%)</span>
        </div>
        <div className="h-2 bg-[#1e2d40] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#c9a96e] transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
        {doneCount > 0 && (
          <button onClick={handleResetAll} className="flex items-center gap-1.5 text-[10px] text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
            <RotateCcw size={10} />
            Set semula semua
          </button>
        )}
      </div>

      {/* Sequence */}
      <div className="space-y-3">
        {KHATAMAN_DZIKIR.map(entry => {
          if (entry.type === 'header') {
            return <SectionHeader key={entry.id} entry={entry} />
          }
          if (entry.type === 'instruction') {
            const done = (progress[entry.id] ?? 0) >= 1
            return (
              <InstructionCard key={entry.id} entry={entry} done={done} onToggle={() => handleToggle(entry)} />
            )
          }
          // type === 'dzikir'
          if (entry.repeatSets && entry.repeatPerSet) {
            return (
              <CounterDzikirCard
                key={entry.id}
                entry={entry}
                count={progress[entry.id] ?? 0}
                onTap={n => handleAdd(entry, n)}
                onReset={() => handleResetEntry(entry.id)}
                showRumi={showRumi}
              />
            )
          }
          return (
            <SimpleDzikirCard
              key={entry.id}
              entry={entry}
              done={(progress[entry.id] ?? 0) >= 1}
              onToggle={() => handleToggle(entry)}
              showRumi={showRumi}
            />
          )
        })}
      </div>

      {doneCount === TRACKABLE.length && (
        <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-6 text-center space-y-2">
          <p className="font-serif text-[#c9a96e] text-2xl">اَللّٰهُ اَكْبَرُ</p>
          <p className="text-[#e8dcc8] text-sm">Khataman selesai. Semoga Allah menerima amalan ini.</p>
          <p className="text-[#8a7a65] text-xs">Al-Fatihah.</p>
        </div>
      )}
    </div>
  )
}
