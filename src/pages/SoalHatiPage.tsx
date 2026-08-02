import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, Loader2, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSoalHatiSession } from '@/hooks/useSoalHatiSession'
import PacedReveal from '@/components/soal-hati/PacedReveal'
import { CHAPTER_META, SOAL_HATI_CHAPTERS, type ChapterId } from '@/data/soalHatiContent'
import { cn } from '@/lib/utils'

const ACCENT = '#7dd3a8' // warna pillar "hati" (lihat src/lib/pillars.ts) — jambatan tema, bukan kebetulan

// Free tier: Bab Pembukaan/1/2 (order 1-3) sahaja. Bab 3-9 (order 4+) Pro sahaja
// — had ni tak bergantung pada sequential unlock, lihat isChapterTierLocked().
const FREE_MAX_ORDER = 3

type ViewState =
  | { mode: 'landing' }
  | { mode: 'chapter'; chapterId: ChapterId }

type ChapterStatus = 'belum' | 'jalan' | 'selesai'
type ChapterLockKind = 'none' | 'sequential' | 'tier'

export default function SoalHatiPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const nama = user?.nickname ?? user?.name?.split(' ')[0] ?? t('umum.sahabat', 'sahabat')
  const isPro = user?.tier === 'pro' || user?.tier === 'family'

  const [view, setView] = useState<ViewState>({ mode: 'landing' })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Satu hook call literal per bab (bukan loop) — kekal patuh rules-of-hooks
  // walaupun CHAPTER_META sekarang ada 10 entri. useSoalHatiSession() sendiri
  // tak berubah (satu row per user+bab, sama macam Fasa 1).
  const pembukaan = useSoalHatiSession('pembukaan')
  const bab1 = useSoalHatiSession('bab_1')
  const bab2 = useSoalHatiSession('bab_2')
  const bab3 = useSoalHatiSession('bab_3')
  const bab4 = useSoalHatiSession('bab_4')
  const bab5 = useSoalHatiSession('bab_5')
  const bab6 = useSoalHatiSession('bab_6')
  const bab7 = useSoalHatiSession('bab_7')
  const bab8 = useSoalHatiSession('bab_8')
  const bab9 = useSoalHatiSession('bab_9')

  const sessionsByChapter: Record<ChapterId, typeof pembukaan> = {
    pembukaan, bab_1: bab1, bab_2: bab2, bab_3: bab3, bab_4: bab4,
    bab_5: bab5, bab_6: bab6, bab_7: bab7, bab_8: bab8, bab_9: bab9,
  }

  const loading = CHAPTER_META.some(c => sessionsByChapter[c.id].loading)

  function statusFor(session: typeof pembukaan.session): ChapterStatus {
    if (session?.completed_at) return 'selesai'
    if (session && session.langkah_terakhir > 0) return 'jalan'
    return 'belum'
  }

  function isDone(chapterId: ChapterId): boolean {
    return !!sessionsByChapter[chapterId].session?.completed_at
  }

  const allNineDone = isDone('bab_9')

  function isChapterTierLocked(chapterId: ChapterId): boolean {
    return !isPro && (CHAPTER_META.find(c => c.id === chapterId)?.order ?? 0) > FREE_MAX_ORDER
  }

  function openChapter(chapterId: ChapterId) {
    if (isChapterTierLocked(chapterId)) {
      setShowUpgradeModal(true)
      return
    }
    setView({ mode: 'chapter', chapterId })
  }

  function handleChapterEnd(
    chapterId: ChapterId,
    action: 'next-chapter' | 'exit' | 'save-and-exit' | 'goto-amalan' | 'restart'
  ) {
    // /amalan sendiri ada gate status talkin sedia ada — tak perlu tanya di
    // sini sekali lagi (elak soalan sama papar dua kali). Semua CTA (Bab
    // 3/8/9) bawa ke landing Amalan TQN umum, bukan deep-link Khafi — user
    // pilih sendiri Jahar/Khafi di sana.
    if (action === 'goto-amalan') {
      navigate('/amalan')
      return
    }
    if (action === 'restart') {
      setView({ mode: 'chapter', chapterId: 'bab_1' })
      return
    }
    if (action === 'next-chapter') {
      const currentOrder = CHAPTER_META.find(c => c.id === chapterId)?.order ?? 0
      const next = CHAPTER_META.find(c => c.order === currentOrder + 1)
      if (next) {
        openChapter(next.id)
        return
      }
    }
    // 'exit' / 'save-and-exit' / atau 'next-chapter' tanpa bab seterusnya
    // (tak patut berlaku lagi lepas Fasa 2, tapi selamat fallback ke landing)
    setView({ mode: 'landing' })
  }

  const activeChapter = view.mode === 'chapter' ? view.chapterId : null
  const activeSession = activeChapter ? sessionsByChapter[activeChapter] : null

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto pb-10">
      {/* Mini header semasa dalam bab */}
      {view.mode !== 'landing' && (
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setView({ mode: 'landing' })}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-[#8a7a65] text-xs uppercase tracking-wider">
            {view.mode === 'chapter'
              ? CHAPTER_META.find(c => c.id === view.chapterId)?.title
              : t('soal_hati.tajuk', 'Soal Hati')}
          </p>
        </div>
      )}

      {view.mode === 'landing' && (
        <LandingScreen
          nama={nama}
          loading={loading}
          allNineDone={allNineDone}
          chapters={CHAPTER_META.map(c => {
            // Tier diutamakan atas sequential — Free user pada Bab 3-9 patut
            // nampak "Pro", bukan "belum selesai bab sebelum ni", walaupun
            // dua-dua syarat sekali gus tak dipenuhi.
            const sequentialLocked = c.order > 1 && !isDone(CHAPTER_META.find(p => p.order === c.order - 1)!.id)
            const lockKind: ChapterLockKind = isChapterTierLocked(c.id)
              ? 'tier'
              : sequentialLocked ? 'sequential' : 'none'
            return { meta: c, status: statusFor(sessionsByChapter[c.id].session), lockKind }
          })}
          onOpen={openChapter}
        />
      )}

      {view.mode === 'chapter' && activeSession && (
        activeSession.loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[#8a7a65]" />
          </div>
        ) : (
          <PacedReveal
            chapterKey={view.chapterId}
            beats={SOAL_HATI_CHAPTERS[view.chapterId]}
            nama={nama}
            initialBeatIndex={activeSession.session?.langkah_terakhir ?? 0}
            initialAnswers={(activeSession.session?.jawapan_checkpoint as Record<string, string> | null) ?? undefined}
            onProgress={(beatIndex, answers, completed) => activeSession.saveProgress(beatIndex, answers, completed)}
            onChapterEnd={action => handleChapterEnd(view.chapterId, action)}
            accent={ACCENT}
          />
        )
      )}

      {showUpgradeModal && <SoalHatiUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  )
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ChapterStatus }) {
  if (status === 'selesai') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: ACCENT }}>
        <CheckCircle2 size={12} /> Selesai
      </span>
    )
  }
  if (status === 'jalan') {
    return <span className="text-[10px] font-medium text-[#c9a96e]">Sedang berjalan</span>
  }
  return null
}

function ChapterCard({
  title,
  subtitle,
  status,
  lockKind,
  onClick,
}: {
  title: string
  subtitle: string
  status: ChapterStatus
  lockKind: ChapterLockKind
  onClick?: () => void
}) {
  // 'sequential' — betul-betul tak boleh diakses lagi (bab sebelum belum
  // selesai), butang disabled macam sebelum ini. 'tier' KEKAL clickable —
  // klik patut buka popup upgrade (dikendalikan oleh onOpen/openChapter),
  // bukan disable terus, supaya user faham ia had langganan bukan sekadar mati.
  const disabled = lockKind === 'sequential' || !onClick
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all',
        lockKind === 'sequential' ? 'opacity-50 cursor-not-allowed border-[#1e2d40]' : 'border-[#1e2d40] hover:border-[#2a3d55]'
      )}
      style={{ backgroundColor: '#0d1821' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: lockKind === 'sequential' ? '#1e2d40' : lockKind === 'tier' ? '#c9a96e18' : `${ACCENT}18`,
          border: `1px solid ${lockKind === 'sequential' ? '#2a3d55' : lockKind === 'tier' ? '#c9a96e40' : ACCENT + '40'}`,
        }}
      >
        {lockKind === 'sequential' ? <Lock size={16} className="text-[#8a7a65]" />
          : lockKind === 'tier' ? <Lock size={16} className="text-[#c9a96e]" />
          : <Sparkles size={16} style={{ color: ACCENT }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[#e8dcc8] text-sm font-medium truncate">{title}</p>
          {lockKind === 'tier' ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#c9a96e20] text-[#c9a96e] border border-[#c9a96e30] flex-shrink-0">
              ✦ Pro
            </span>
          ) : (
            <StatusBadge status={status} />
          )}
        </div>
        <p className="text-[#8a7a65] text-xs truncate">{subtitle}</p>
      </div>
      {lockKind !== 'sequential' && <ChevronRight size={16} className="text-[#8a7a65] flex-shrink-0" />}
    </button>
  )
}

function LandingScreen({
  nama,
  loading,
  allNineDone,
  chapters,
  onOpen,
}: {
  nama: string
  loading: boolean
  allNineDone: boolean
  chapters: { meta: (typeof CHAPTER_META)[number]; status: ChapterStatus; lockKind: ChapterLockKind }[]
  onOpen: (chapterId: ChapterId) => void
}) {
  return (
    <div className="space-y-5 pb-8">
      <div className="text-center pt-2 space-y-1.5">
        <p className="font-serif text-2xl" style={{ color: ACCENT }}>💚</p>
        <h1 className="font-serif text-2xl text-[#e8dcc8]">Soal Hati</h1>
        <p className="text-[#8a7a65] text-sm max-w-xs mx-auto leading-relaxed">
          Satu dialog perlahan-lahan, {nama} — bukan soal selidik. Mari cari hati bersama, bab demi bab.
        </p>
        {/* Lencana kecil — ikut semangat Mod Hamba: pengiktirafan senyap,
            bukan skor/pencapaian besar-besaran. */}
        {allNineDone && (
          <span
            className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: `${ACCENT}18`, border: `1px solid ${ACCENT}40`, color: ACCENT }}
          >
            <CheckCircle2 size={12} /> Selesai 9 Bab Soal Hati
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-[#8a7a65]" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {chapters.map(({ meta, status, lockKind }) => (
            <ChapterCard
              key={meta.id}
              title={meta.title}
              subtitle={meta.subtitle}
              status={status}
              lockKind={lockKind}
              onClick={lockKind === 'sequential' ? undefined : () => onOpen(meta.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Upgrade modal ────────────────────────────────────────────────────────────
// Pattern sama seperti UpgradeModal (PintuRezekiPage.tsx), HablumUpgradeModal
// (HablumPage.tsx), AuditUpgradeModal (AuditJiwaPage.tsx) — setiap page yang
// ada gate Pro bina salinan tempatannya sendiri (bukan komponen kongsi
// diexport), guna /api/create-bill terus. Ikut konvensyen sedia ada, bukan
// cipta mekanisme baharu.
function SoalHatiUpgradeModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const [loadingPkg, setLoadingPkg] = useState<'pro' | 'pro_plus' | null>(null)
  const [error, setError] = useState('')

  async function handleUpgrade(pkg: 'pro' | 'pro_plus') {
    if (!user) return
    setError('')
    setLoadingPkg(pkg)
    try {
      const res = await fetch('/api/create-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, email: user.email, nama: user.name ?? user.email, package: pkg }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data?.error?.message ?? 'Gagal mencipta bil')
      window.location.href = data.url
    } catch {
      setError('Gagal memulakan pembayaran. Sila cuba lagi.')
      setLoadingPkg(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-medium text-sm">Bab Pro</p>
        </div>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          Bab 3 hingga 9 tersedia untuk pengguna Pro. Naik taraf untuk teruskan perjalanan Soal Hati sepenuhnya.
        </p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="space-y-2">
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loadingPkg === 'pro' && <Loader2 size={14} className="animate-spin" />}
            Naik Taraf ke Pro — RM19.90/bulan
          </button>
          <button
            onClick={() => handleUpgrade('pro_plus')}
            disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loadingPkg === 'pro_plus' && <Loader2 size={14} className="animate-spin" />}
            Naik Taraf ke Pro Plus — RM29.90/bulan
          </button>
          <button
            onClick={onClose}
            disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors disabled:opacity-60"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
