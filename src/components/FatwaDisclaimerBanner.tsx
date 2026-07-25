import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Banner tetap (bukan sebahagian respons AI) — supaya skop "soalan rohani,
// bukan hukum hakam" sentiasa kelihatan tanpa bergantung pada AI patuh 100%
// kepada FATWA_BOUNDARY dalam system prompt.
export default function FatwaDisclaimerBanner() {
  const { t } = useTranslation()
  return (
    <div className="flex-shrink-0 px-5 md:px-8 py-2 bg-[#c9a96e0d] border-b border-[#c9a96e26] flex items-start gap-2">
      <Info size={13} className="text-[#8a7a65] flex-shrink-0 mt-0.5" />
      <p className="text-[#8a7a65] text-[11px] leading-snug">{t('umum.fatwa_disclaimer')}</p>
    </div>
  )
}
