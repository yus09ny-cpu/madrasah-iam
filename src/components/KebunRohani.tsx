import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useStreak } from '@/hooks/useStreak'
import { cn } from '@/lib/utils'

// ─── Tree State ───────────────────────────────────────────────────────────────

type TreeState = 'subur' | 'normal' | 'layu' | 'baru'

function getTreeState(lastEntry: string | null, current: number): TreeState {
  if (current === 0 && !lastEntry) return 'baru'
  if (!lastEntry) return 'layu'
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (lastEntry === today) return 'subur'
  if (lastEntry === yesterday) return 'normal'
  return 'layu'
}

function isBulanBaru() {
  return new Date().getDate() === 1
}

// ─── SVG Tree ─────────────────────────────────────────────────────────────────

const TREE_COLORS: Record<TreeState, { canopy: string; glow: string; accent: string; label: string }> = {
  subur:  { canopy: '#4ade80', glow: '#4ade8030', accent: '#22c55e', label: 'Subur — Alhamdulillah ✦' },
  normal: { canopy: '#86efac', glow: '#86efac20', accent: '#4ade80', label: 'Masih hijau — teruskan' },
  layu:   { canopy: '#fbbf24', glow: '#fbbf2415', accent: '#f59e0b', label: 'Perlukan siraman — hari ini' },
  baru:   { canopy: '#60a5fa', glow: '#60a5fa20', accent: '#3b82f6', label: 'Pokok baru — tanam hari ini' },
}

function TreeSVG({ state }: { state: TreeState }) {
  const { canopy, glow, accent } = TREE_COLORS[state]
  const isLayu = state === 'layu'

  return (
    <svg viewBox="0 0 160 180" className="w-full h-full" style={{ filter: `drop-shadow(0 0 12px ${glow})` }}>
      {/* Root shadows */}
      <ellipse cx="80" cy="165" rx="28" ry="6" fill="#0d1821" opacity="0.6" />

      {/* Trunk */}
      <rect x="72" y="120" width="16" height="46" rx="4" fill="#6b4c1e" />
      <rect x="75" y="120" width="4" height="46" rx="2" fill="#8B6914" opacity="0.5" />

      {/* Roots */}
      <path d="M72 158 Q60 164 52 162" stroke="#6b4c1e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M88 160 Q98 166 106 163" stroke="#6b4c1e" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Glow background */}
      <circle cx="80" cy="88" r="58" fill={glow} />

      {/* Canopy — 3 overlapping circles */}
      <circle cx="80" cy="75" r="42" fill={canopy} opacity={isLayu ? 0.5 : 0.75}
        style={{ animation: isLayu ? 'none' : 'gentleSway 4s ease-in-out infinite' }} />
      <circle cx="55" cy="95" r="30" fill={canopy} opacity={isLayu ? 0.4 : 0.65} />
      <circle cx="105" cy="95" r="30" fill={canopy} opacity={isLayu ? 0.4 : 0.65} />

      {/* Canopy highlight */}
      <circle cx="68" cy="60" r="18" fill={accent} opacity={isLayu ? 0.2 : 0.4} />

      {/* Subur: dewdrops */}
      {state === 'subur' && <>
        <circle cx="50" cy="82" r="3" fill="#bfdbfe" opacity="0.8" />
        <circle cx="112" cy="78" r="2.5" fill="#bfdbfe" opacity="0.8" />
        <circle cx="78" cy="45" r="2" fill="#bfdbfe" opacity="0.7" />
        {/* Sun ray */}
        <circle cx="130" cy="30" r="8" fill="#fde68a" opacity="0.5" />
      </>}

      {/* Layu: falling leaves */}
      {isLayu && <>
        <ellipse cx="45" cy="108" rx="6" ry="3" fill={canopy} opacity="0.6" transform="rotate(-20 45 108)" />
        <ellipse cx="118" cy="112" rx="5" ry="2.5" fill={canopy} opacity="0.5" transform="rotate(15 118 112)" />
        <ellipse cx="30" cy="130" rx="4" ry="2" fill={canopy} opacity="0.4" transform="rotate(-30 30 130)" />
      </>}

      {/* Baru: sprout */}
      {state === 'baru' && <>
        <circle cx="80" cy="75" r="20" fill={accent} opacity="0.3" />
        <path d="M76 90 Q80 70 84 90" stroke={accent} strokeWidth="2" fill="none" />
      </>}
    </svg>
  )
}

// ─── Bulan Baru Message ───────────────────────────────────────────────────────

function BulanBaruMsg() {
  const { t } = useTranslation()
  return (
    <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 text-center space-y-3">
      <p className="text-[#c9a96e] font-medium text-sm">{t('kebun.bulan_baru')}</p>
      <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
        كُلُّ يَوْمٍ هُوَ فِي شَأْنٍ
      </p>
      <p className="text-[#8a7a65] text-xs italic">{t('kebun.bulan_baru_ayat')}</p>
      <div className="h-px bg-[#1e2d40]" />
      <p className="text-[#8a7a65] text-xs leading-relaxed">
        {t('kebun.bulan_baru_desc')}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KebunRohani() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: streak } = useStreak()

  const state = useMemo(() => {
    return getTreeState(streak?.lastEntry ?? null, streak?.current ?? 0)
  }, [streak?.lastEntry, streak?.current])

  const bulanBaru = isBulanBaru()

  const labelKey = `kebun.${state}_label` as const
  const descKey = `kebun.${state}_desc` as const
  const labelColor = state === 'subur' ? 'text-emerald-400' :
    state === 'baru' ? 'text-blue-400' : 'text-[#c9a96e]'

  return (
    <div className="space-y-3">
      {state === 'layu' ? (
        /* Perlu siraman — reka bentuk kemas tanpa pokok besar */
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
          <p className="text-amber-400 text-sm font-medium flex items-center gap-2">
            <span>💧</span>
            {t('kebun.layu_label')}
          </p>

          <p className="text-[#8a7a65] text-xs leading-relaxed">
            {t('kebun.layu_desc')}
          </p>

          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3">
            <p className="font-serif text-[#c9a96e] text-xs leading-loose" dir="rtl">
              وَاعْبُدْ رَبَّكَ حَتَّىٰ يَأْتِيَكَ الْيَقِينُ
            </p>
            <p className="text-[#8a7a65] text-[10px] mt-1">
              {t('kebun.ayat_hijr')}
            </p>
          </div>

          <button
            onClick={() => navigate('/zikir')}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-[#c9a96e15] border border-[#c9a96e30] text-[#c9a96e] hover:bg-[#c9a96e20] transition-colors"
          >
            ▶ Mulakan Amalan
          </button>
        </div>
      ) : (
        /* Tree visual */
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5">
          <div className="flex items-center gap-5">
            {/* Tree */}
            <div className="w-28 h-32 flex-shrink-0">
              <TreeSVG state={state} />
            </div>

            {/* Text */}
            <div className="flex-1 space-y-2">
              <p className={cn('text-sm font-medium', labelColor)}>
                {t(labelKey)}
              </p>

              <p className="text-[#8a7a65] text-xs leading-relaxed">
                {t(descKey)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulan Baru */}
      {bulanBaru && <BulanBaruMsg />}
    </div>
  )
}
