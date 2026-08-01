import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { usePillarLiveScore } from '@/hooks/usePillarLiveScore'
import { PILLARS, PILLAR_CONFIG } from '@/lib/pillars'
import { ScoreBar } from '@/components/PillarScoreBar'
import { cn } from '@/lib/utils'

/**
 * Bar 4 Dimensi (Raga/Hati/Akal/Ruh) "hidup" — baseline dari Audit Jiwa
 * terkini + pelarasan kecil ikut solat/zikir/muhasabah berterusan sejak itu.
 * Sembunyi sepenuhnya kalau pengguna belum pernah siapkan Audit Jiwa.
 */
export default function PillarLiveStatus({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = usePillarLiveScore()

  if (isLoading || !data) return null

  const { displayScores, baselineDate, weakestPillar } = data
  const wcfg = PILLAR_CONFIG[weakestPillar]

  return (
    <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
            {t('pillar_live.tajuk', 'Status 4 Dimensi Anda')}
          </p>
          <p className="text-[10px] text-[#6a5a46] mt-0.5">
            {t('pillar_live.baseline_desc', 'Berdasarkan Audit Jiwa {{date}}, dikemas kini ikut amalan harian anda', {
              date: format(new Date(baselineDate), 'd MMM'),
            })}
          </p>
        </div>
        {compact && (
          <button
            onClick={() => navigate('/audit-jiwa')}
            className="text-[11px] text-[#c9a96e] whitespace-nowrap hover:underline"
          >
            {t('pillar_live.lihat_penuh', 'Lihat Penuh →')}
          </button>
        )}
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-1')}>
        {PILLARS.map(p => <ScoreBar key={p} pillar={p} score={displayScores[p]} />)}
      </div>

      {!compact && (
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: wcfg.bg, color: wcfg.text }}>
          {t('pillar_live.lemah_hint', '{{pillar}} paling perlu perhatian anda sekarang — teruskan istiqamah, ia akan naik perlahan-lahan.', {
            pillar: t(`ajv2.pillar_${weakestPillar}`, weakestPillar),
          })}
        </div>
      )}
    </div>
  )
}
