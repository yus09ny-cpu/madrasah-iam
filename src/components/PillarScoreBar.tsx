import { useTranslation } from 'react-i18next'
import { PILLAR_CONFIG, getScoreStatus, type PillarKey } from '@/lib/pillars'

export function ScoreBar({ pillar, score }: { pillar: PillarKey; score: number }) {
  const { t } = useTranslation()
  const cfg = PILLAR_CONFIG[pillar]
  const status = getScoreStatus(score)
  const pct = Math.round((score / 10) * 100)

  return (
    <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <div>
            <p className="text-sm font-medium" style={{ color: cfg.text }}>
              {t(`ajv2.pillar_${pillar}`, pillar)}
            </p>
            <p className="text-[10px] text-[#8a7a65]">{t(`ajv2.pillar_${pillar}_sub`, '')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums" style={{ color: status.color }}>
            {score.toFixed(1)}/10
          </p>
          <p className="text-[10px]" style={{ color: status.color }}>
            {t(`ajv2.status_${status.label}`, status.label)}
          </p>
        </div>
      </div>
      <div className="h-2 bg-[#1e2d40] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: status.color }}
        />
      </div>
    </div>
  )
}
