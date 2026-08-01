import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, Loader2, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSoalHatiSession } from '@/hooks/useSoalHatiSession'
import PacedReveal from '@/components/soal-hati/PacedReveal'
import { CHAPTER_META, SOAL_HATI_CHAPTERS, type ChapterId } from '@/data/soalHatiContent'
import { cn } from '@/lib/utils'

const ACCENT = '#7dd3a8' // warna pillar "hati" (lihat src/lib/pillars.ts) — jambatan tema, bukan kebetulan

type ViewState =
  | { mode: 'landing' }
  | { mode: 'chapter'; chapterId: ChapterId }
  | { mode: 'bab1-selesai' }

export default function SoalHatiPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const nama = user?.nickname ?? user?.name?.split(' ')[0] ?? t('umum.sahabat', 'sahabat')

  const [view, setView] = useState<ViewState>({ mode: 'landing' })

  const pembukaan = useSoalHatiSession('pembukaan')
  const bab1 = useSoalHatiSession('bab_1')

  const pembukaanDone = !!pembukaan.session?.completed_at
  const bab1Done = !!bab1.session?.completed_at

  function statusFor(session: typeof pembukaan.session): 'belum' | 'jalan' | 'selesai' {
    if (session?.completed_at) return 'selesai'
    if (session && session.langkah_terakhir > 0) return 'jalan'
    return 'belum'
  }

  function openChapter(chapterId: ChapterId) {
    setView({ mode: 'chapter', chapterId })
  }

  function handleChapterEnd(chapterId: ChapterId, action: 'next-chapter' | 'exit' | 'save-and-exit') {
    if (chapterId === 'pembukaan') {
      if (action === 'next-chapter') {
        setView({ mode: 'chapter', chapterId: 'bab_1' })
      } else {
        setView({ mode: 'landing' })
      }
      return
    }
    // bab_1 — kedua-dua butang ("Simpan refleksi" / "Tamat untuk hari ini") bawa
    // ke skrin "Bab akan datang" yang sama — belum ada bab lain untuk diteruskan.
    void action
    setView({ mode: 'bab1-selesai' })
  }

  const activeChapter = view.mode === 'chapter' ? view.chapterId : null
  const activeSession = activeChapter === 'pembukaan' ? pembukaan : activeChapter === 'bab_1' ? bab1 : null

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
          statusPembukaan={statusFor(pembukaan.session)}
          statusBab1={statusFor(bab1.session)}
          pembukaanDone={pembukaanDone}
          loading={pembukaan.loading || bab1.loading}
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

      {view.mode === 'bab1-selesai' && (
        <Bab1SelesaiScreen bab1Done={bab1Done} onKembali={() => setView({ mode: 'landing' })} />
      )}
    </div>
  )
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'belum' | 'jalan' | 'selesai' }) {
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
  locked,
  onClick,
}: {
  title: string
  subtitle: string
  status: 'belum' | 'jalan' | 'selesai'
  locked?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked || !onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all',
        locked ? 'opacity-50 cursor-not-allowed border-[#1e2d40]' : 'border-[#1e2d40] hover:border-[#2a3d55]'
      )}
      style={{ backgroundColor: '#0d1821' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: locked ? '#1e2d40' : `${ACCENT}18`, border: `1px solid ${locked ? '#2a3d55' : ACCENT + '40'}` }}
      >
        {locked ? <Lock size={16} className="text-[#8a7a65]" /> : <Sparkles size={16} style={{ color: ACCENT }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[#e8dcc8] text-sm font-medium truncate">{title}</p>
          <StatusBadge status={status} />
        </div>
        <p className="text-[#8a7a65] text-xs truncate">{subtitle}</p>
      </div>
      {!locked && <ChevronRight size={16} className="text-[#8a7a65] flex-shrink-0" />}
    </button>
  )
}

function LandingScreen({
  nama,
  statusPembukaan,
  statusBab1,
  pembukaanDone,
  loading,
  onOpen,
}: {
  nama: string
  statusPembukaan: 'belum' | 'jalan' | 'selesai'
  statusBab1: 'belum' | 'jalan' | 'selesai'
  pembukaanDone: boolean
  loading: boolean
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
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-[#8a7a65]" />
        </div>
      ) : (
        <div className="space-y-2.5">
          <ChapterCard
            title="Bab Pembukaan"
            subtitle="Mencari hati bersama"
            status={statusPembukaan}
            onClick={() => onOpen('pembukaan')}
          />
          <ChapterCard
            title="Bab 1: Hakikat Hati"
            subtitle="Hati sebagai pusat kesedaran"
            status={statusBab1}
            locked={!pembukaanDone}
            onClick={pembukaanDone ? () => onOpen('bab_1') : undefined}
          />
          {CHAPTER_META.filter(c => c.status === 'coming_soon').map(c => (
            <ChapterCard key={c.id} title={c.title} subtitle={c.subtitle} status="belum" locked />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Skrin selepas Bab 1 tamat ──────────────────────────────────────────────
// Belum ada bab seterusnya untuk diteruskan (Fasa 1 sengaja hanya 2 bab) —
// skrin ini sengaja neutral/terbuka, bukan CTA kuat, dan bukan skrin kosong.

function Bab1SelesaiScreen({ bab1Done, onKembali }: { bab1Done: boolean; onKembali: () => void }) {
  return (
    <div className="space-y-5 pb-8 text-center pt-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
        style={{ backgroundColor: `${ACCENT}18`, border: `1px solid ${ACCENT}40` }}
      >
        {bab1Done ? <CheckCircle2 size={24} style={{ color: ACCENT }} /> : <Sparkles size={24} style={{ color: ACCENT }} />}
      </div>
      <div className="space-y-1.5">
        <h2 className="font-serif text-xl text-[#e8dcc8]">Bab 1 Selesai</h2>
        <p className="text-[#8a7a65] text-sm max-w-xs mx-auto leading-relaxed">
          Ini baru permulaan perjalanan mengenali hati. Bab seterusnya sedang dalam persediaan — nantikan kemas kini akan datang.
        </p>
      </div>
      <button
        onClick={onKembali}
        className="w-full max-w-xs mx-auto py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 block"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: '#060d16' }}
      >
        Kembali ke Soal Hati
      </button>
    </div>
  )
}
