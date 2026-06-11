import { useEffect, useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import { useStreak } from '@/hooks/useStreak'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Growth scoring ───────────────────────────────────────────────────────────

type Stage = 'benih' | 'tunas' | 'anak' | 'muda' | 'matang'

function getStage(score: number): Stage {
  if (score <= 10) return 'benih'
  if (score <= 30) return 'tunas'
  if (score <= 60) return 'anak'
  if (score <= 100) return 'muda'
  return 'matang'
}

const STAGE_LABELS: Record<Stage, string> = {
  benih: '🌱 Benih baru ditanam...',
  tunas: '🌿 Tunas mula tumbuh...',
  anak: '🌾 Akar mula kukuh...',
  muda: '🌲 Mula berbuah...',
  matang: '🌳 Pokok yang teguh ✦',
}

const TALKIN_LABELS: Record<Stage, string> = {
  benih: '✦ Benih Tauhid baru ditalkin...',
  tunas: '✦ Nur mula masuk ke hati...',
  anak: '✦ Zikir mengukuhkan akar...',
  muda: '✦ Iman mula berbuah...',
  matang: '✦ Pokok Tauhid bersinar',
}

// ─── Visuals ──────────────────────────────────────────────────────────────────

const STAGE_HEIGHT: Record<Stage, number> = {
  benih: 0,
  tunas: 14,
  anak: 26,
  muda: 40,
  matang: 54,
}

const STAGE_CANOPY: Record<Stage, { rx: number; ry: number }> = {
  benih: { rx: 0, ry: 0 },
  tunas: { rx: 8, ry: 6 },
  anak: { rx: 13, ry: 9 },
  muda: { rx: 17, ry: 12 },
  matang: { rx: 22, ry: 16 },
}

function FreePlant({ stage }: { stage: Stage }) {
  const h = STAGE_HEIGHT[stage]
  const canopy = STAGE_CANOPY[stage]
  const showInner = stage === 'anak' || stage === 'muda' || stage === 'matang'
  const showFruits = stage === 'muda' || stage === 'matang'

  return (
    <svg viewBox="0 0 80 90" className={cn('w-20 h-24', stage === 'matang' && 'animate-breathe')}>
      <ellipse cx="40" cy="80" rx="26" ry="6" fill="#6b4c1e" opacity="0.4" />
      {stage === 'benih' ? (
        <ellipse cx="40" cy="74" rx="9" ry="6" fill="#8B6914" opacity="0.6" />
      ) : (
        <rect x="37.5" y={78 - h} width="5" height={h} rx="2" fill="#8B6914" />
      )}
      {canopy.rx > 0 && (
        <>
          <ellipse cx="40" cy={78 - h - 6} rx={canopy.rx} ry={canopy.ry} fill="#639922" opacity="0.85" />
          {showInner && (
            <ellipse cx="40" cy={78 - h - 13} rx={canopy.rx * 0.7} ry={canopy.ry * 0.7} fill="#97C459" opacity="0.85" />
          )}
          {showFruits && (
            <>
              <circle cx={40 - canopy.rx * 0.4} cy={78 - h - 8} r="3" fill="#c9a96e" />
              <circle cx={40 + canopy.rx * 0.4} cy={78 - h - 11} r="3" fill="#c9a96e" />
              {stage === 'matang' && <circle cx="40" cy={78 - h - 18} r="3" fill="#c9a96e" />}
            </>
          )}
        </>
      )}
    </svg>
  )
}

function TalkinPlant({ stage }: { stage: Stage }) {
  const h = STAGE_HEIGHT[stage]
  const canopy = STAGE_CANOPY[stage]
  const isMatang = stage === 'matang'
  const showInner = stage === 'anak' || stage === 'muda' || stage === 'matang'
  const showFruits = stage === 'muda' || stage === 'matang'

  return (
    <div className="relative w-20 h-24">
      {isMatang && <div className="absolute inset-0 rounded-full bg-[#c9a96e30] blur-xl animate-pulse" />}
      <svg viewBox="0 0 80 90" className={cn('relative w-20 h-24', isMatang && 'animate-breathe')}>
        <ellipse cx="40" cy="80" rx="26" ry="6" fill="#6b4c1e" opacity="0.4" />
        {stage === 'benih' ? (
          <ellipse cx="40" cy="74" rx="9" ry="6" fill="#8B6914" opacity="0.6" />
        ) : (
          <rect x="37.5" y={78 - h} width="5" height={h} rx="2" fill="#a0822e" />
        )}
        {canopy.rx > 0 && (
          <>
            <ellipse cx="40" cy={78 - h - 6} rx={canopy.rx} ry={canopy.ry} fill="#7c5cbf" opacity="0.8" />
            {showInner && (
              <ellipse cx="40" cy={78 - h - 13} rx={canopy.rx * 0.7} ry={canopy.ry * 0.7} fill="#a78bfa" opacity="0.85" />
            )}
            {showFruits && (
              <>
                <circle cx={40 - canopy.rx * 0.4} cy={78 - h - 8} r="3" fill="#fde68a" />
                <circle cx={40 + canopy.rx * 0.4} cy={78 - h - 11} r="3" fill="#fde68a" />
                {isMatang && <circle cx="40" cy={78 - h - 18} r="3" fill="#fde68a" />}
              </>
            )}
          </>
        )}
        {isMatang && (
          <>
            <line x1="40" y1={78 - h - 6} x2="40" y2="6" stroke="#fde68a" strokeWidth="1" opacity="0.5" />
            <text x="24" y="20" fontSize="9" fill="#fde68a" opacity="0.85">✦</text>
            <text x="54" y="14" fontSize="7" fill="#fde68a" opacity="0.6">✦</text>
            <text x="40" y="6" fontSize="7" fill="#fde68a" opacity="0.7">✦</text>
          </>
        )}
      </svg>
    </div>
  )
}

function LockedPlant() {
  return (
    <svg viewBox="0 0 80 90" className="w-20 h-24 opacity-40">
      <ellipse cx="40" cy="80" rx="26" ry="6" fill="#8B6914" opacity="0.3" />
      <ellipse cx="40" cy="72" rx="9" ry="6" fill="#8B6914" opacity="0.4" />
      <text x="40" y="50" textAnchor="middle" fontSize="18" fill="#c9a96e" opacity="0.4">✦</text>
    </svg>
  )
}

// ─── Status panel row ─────────────────────────────────────────────────────────

function AmalanRow({ icon, label, value, progress, done }: { icon: string; label: string; value: string; progress: number; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-5 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[#e8dcc8] text-xs">{label}</p>
          <p className={cn('text-xs font-medium flex-shrink-0', done ? 'text-emerald-400' : 'text-[#8a7a65]')}>{value}</p>
        </div>
        <div className="h-1 rounded-full bg-[#1e2d40] mt-1 overflow-hidden">
          <div
            className={cn('h-full rounded-full', done ? 'bg-emerald-400' : 'bg-[#c9a96e]')}
            style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Stats loading ──────────────────────────────────────────────────────────────

interface BenihStats {
  solatCount: number
  auditDone: boolean
  zikirCount: number
  rezekiDone: boolean
  jaharCount: number
  khafiMinit: number
  totalDays: number
}

const EMPTY_STATS: BenihStats = {
  solatCount: 0,
  auditDone: false,
  zikirCount: 0,
  rezekiDone: false,
  jaharCount: 0,
  khafiMinit: 0,
  totalDays: 0,
}

function checkRezekiDone(today: string): boolean {
  try {
    const raw = localStorage.getItem(`madrasah_rezeki_${today}`)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { amalan?: Record<string, boolean> }
    return Object.values(parsed.amalan ?? {}).some(Boolean)
  } catch {
    return false
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BenihTauhid() {
  const { user } = useAuthStore()
  const { data: streak } = useStreak()
  const [stats, setStats] = useState<BenihStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [statusOpen, setStatusOpen] = useState(false)

  const hasTalqin = user?.talqin_completed === true

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const today = format(new Date(), 'yyyy-MM-dd')
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')

      const [
        { data: solatRow },
        { count: auditCount },
        { count: zikirTodayCount },
        { data: zikir30Rows },
        { data: solat30Rows },
        { data: muhasabah30Rows },
      ] = await Promise.all([
        supabase.from('solat_entries').select('prayers').eq('user_id', user!.id).eq('date', today).maybeSingle(),
        supabase.from('muhasabah_entries').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('date', today),
        supabase.from('zikir_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('date', today).eq('completed', true),
        supabase.from('zikir_sessions').select('date').eq('user_id', user!.id).eq('completed', true).gte('date', since),
        supabase.from('solat_entries').select('date').eq('user_id', user!.id).gte('date', since),
        supabase.from('muhasabah_entries').select('date').eq('user_id', user!.id).gte('date', since),
      ])

      const activeDays = new Set<string>()
      ;(zikir30Rows ?? []).forEach((r: { date: string }) => activeDays.add(r.date))
      ;(solat30Rows ?? []).forEach((r: { date: string }) => activeDays.add(r.date))
      ;(muhasabah30Rows ?? []).forEach((r: { date: string }) => activeDays.add(r.date))

      const prayers = Array.isArray((solatRow as { prayers?: unknown } | null)?.prayers)
        ? ((solatRow as unknown as { prayers: Array<{ completed: boolean }> }).prayers)
        : []
      const solatCount = prayers.filter((p) => p?.completed).length

      let jaharCount = 0
      let khafiMinit = 0

      if (hasTalqin) {
        // 'amalan_sessions' bukan jadual dalam types/database.ts — guna `as any`
        // mengikut corak sedia ada (lihat AmalanPage.tsx).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [{ data: amalanTodayRows }, { data: amalan30Rows }] = await Promise.all([
          (supabase.from('amalan_sessions') as any)
            .select('jahar_kiraan, khafi_minit')
            .eq('user_id', user!.id)
            .eq('session_date', today),
          (supabase.from('amalan_sessions') as any)
            .select('session_date')
            .eq('user_id', user!.id)
            .gte('session_date', since),
        ])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(amalanTodayRows ?? []).forEach((r: any) => {
          jaharCount += r.jahar_kiraan ?? 0
          khafiMinit += r.khafi_minit ?? 0
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(amalan30Rows ?? []).forEach((r: any) => {
          if (r.session_date) activeDays.add(r.session_date)
        })
      }

      if (!cancelled) {
        setStats({
          solatCount,
          auditDone: (auditCount ?? 0) > 0,
          zikirCount: zikirTodayCount ?? 0,
          rezekiDone: checkRezekiDone(today),
          jaharCount,
          khafiMinit,
          totalDays: activeDays.size,
        })
        setLoading(false)
      }
    }

    load().catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, hasTalqin])

  const freeScore = useMemo(() => {
    const s = streak?.current ?? 0
    return s * 3 + (stats.auditDone ? 10 : 0) + stats.zikirCount * 2 + stats.solatCount * 3 + stats.totalDays * 1
  }, [streak?.current, stats])

  const talkinScore = useMemo(() => {
    if (!hasTalqin) return 0
    return freeScore + stats.jaharCount * 2 + stats.khafiMinit * 3
  }, [hasTalqin, freeScore, stats])

  const freeStage = getStage(freeScore)
  const talkinStage = getStage(talkinScore)

  if (loading) {
    return (
      <div className="bg-[#0d1821]/80 border border-[#c9a96e20] rounded-2xl p-5 h-[180px] animate-pulse" />
    )
  }

  return (
    <div className="bg-[#0d1821]/80 border border-[#c9a96e20] rounded-2xl p-5 space-y-4">

      {/* Streak */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-[#c9a96e]">
        <span>🔥</span>
        <span className="font-medium">{streak?.current ?? 0} hari berturut-turut</span>
      </div>

      {/* Dua Benih */}
      <div className="flex gap-4">
        <div className="flex-1 flex flex-col items-center gap-2">
          <p className="text-[#8a7a65] text-[11px] text-center">Amalan Jiwa</p>
          <FreePlant stage={freeStage} />
          <p className="text-[#c9a96e] text-[11px] text-center italic">{STAGE_LABELS[freeStage]}</p>
        </div>

        <div className="w-px bg-[#c9a96e20] self-stretch" />

        <div className="flex-1 flex flex-col items-center gap-2">
          <p className="text-[#8a7a65] text-[11px] text-center">
            {hasTalqin ? 'Benih Tauhid ✦' : 'Menunggu Talkin'}
          </p>
          {hasTalqin ? <TalkinPlant stage={talkinStage} /> : <LockedPlant />}
          <p className={cn('text-[11px] text-center italic', hasTalqin ? 'text-violet-400' : 'text-[#4a3a26]')}>
            {hasTalqin ? TALKIN_LABELS[talkinStage] : 'Ditalkin untuk membuka...'}
          </p>
        </div>
      </div>

      {/* Toggle status */}
      <button
        onClick={() => setStatusOpen((v) => !v)}
        className="w-full text-center text-xs text-[#8a7a65] hover:text-[#c9a96e] transition-colors"
      >
        {statusOpen ? 'Tutup ▴' : 'Lihat Status ▾'}
      </button>

      {/* Status panel */}
      {statusOpen && (
        <div className="pt-3 border-t border-[#c9a96e15] space-y-3">
          <AmalanRow
            icon="🕌"
            label="Solat"
            value={`${stats.solatCount}/5`}
            progress={stats.solatCount / 5}
            done={stats.solatCount === 5}
          />
          <AmalanRow
            icon="📖"
            label="Audit Jiwa"
            value={stats.auditDone ? '✓ Selesai' : 'Belum'}
            progress={stats.auditDone ? 1 : 0}
            done={stats.auditDone}
          />
          <AmalanRow
            icon="✨"
            label="Zikir Am"
            value={stats.zikirCount > 0 ? `✓ ${stats.zikirCount}x` : 'Belum'}
            progress={Math.min(stats.zikirCount / 3, 1)}
            done={stats.zikirCount > 0}
          />
          <AmalanRow
            icon="🤲"
            label="Pintu Rezeki"
            value={stats.rezekiDone ? '✓ Selesai' : 'Belum'}
            progress={stats.rezekiDone ? 1 : 0}
            done={stats.rezekiDone}
          />
          {hasTalqin && (
            <>
              <AmalanRow
                icon="🌙"
                label="Zikir Jahar"
                value={stats.jaharCount > 0 ? `✓ ${stats.jaharCount}x` : 'Belum'}
                progress={Math.min(stats.jaharCount / 165, 1)}
                done={stats.jaharCount > 0}
              />
              <AmalanRow
                icon="💫"
                label="Zikir Khafi"
                value={stats.khafiMinit > 0 ? `✓ ${stats.khafiMinit} minit` : 'Belum'}
                progress={Math.min(stats.khafiMinit / 10, 1)}
                done={stats.khafiMinit > 0}
              />
            </>
          )}

          {/* Renungan */}
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center mt-2">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
              وَاللَّهُ أَنبَتَكُم مِّنَ الْأَرْضِ نَبَاتًا
            </p>
            <p className="text-[#8a7a65] text-xs mt-1 italic">— Surah Nuh: 17</p>
            <p className="font-serif text-[#c9a96e] text-sm leading-loose mt-3" dir="rtl">
              إِلَٰهِي أَنْتَ مَقْصُودِي وَرِضَاكَ مَطْلُوبِي
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 leading-relaxed">
              Setiap amalan hari ini adalah siraman untuk benih tauhid dalam jiwa.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
