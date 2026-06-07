import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import ZikirAmm from '@/components/zikir/ZikirAmm'
import ZikirKhas from '@/components/zikir/ZikirKhas'

type Tab = 'amm' | 'khas'

export default function ZikirPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'khas' ? 'khas' : 'amm')
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null)

  const TOOLTIPS: Record<Tab, string> = {
    amm: t('zikir.tooltip_am'),
    khas: t('zikir.tooltip_khas'),
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-8">

      {/* Header */}
      <div>
        <p className="font-serif text-3xl text-[#c9a96e] leading-none">ذِكْر</p>
        <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('zikir.tajuk')}</h1>
        <p className="text-[#8a7a65] text-sm mt-0.5">{t('zikir.sub')}</p>
      </div>

      {/* Tab Toggle */}
      <div className="space-y-2">
        <div className="flex bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1 gap-1">
          {(['amm', 'khas'] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              onMouseEnter={() => setHoveredTab(tabKey)}
              onMouseLeave={() => setHoveredTab(null)}
              onFocus={() => setHoveredTab(tabKey)}
              onBlur={() => setHoveredTab(null)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                tab === tabKey
                  ? 'bg-[#c9a96e] text-[#060d16]'
                  : 'text-[#8a7a65] hover:text-[#e8dcc8]'
              )}
            >
              {tabKey === 'amm' ? t('zikir.zikir_am') : `${t('zikir.zikir_khas')} ✦`}
            </button>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredTab && (
          <p className="text-[#8a7a65] text-xs text-center leading-relaxed px-4 transition-all duration-200">
            {TOOLTIPS[hoveredTab]}
          </p>
        )}
      </div>

      {/* Content */}
      {tab === 'amm'
        ? <ZikirAmm />
        : <ZikirKhas onBackToAmm={() => setTab('amm')} />
      }

    </div>
  )
}
