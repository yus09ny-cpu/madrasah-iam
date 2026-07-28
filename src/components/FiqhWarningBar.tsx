import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Amaran AKTIF (bukan pasif seperti FatwaDisclaimerBanner) — muncul bila teks
// yang belum dihantar dikesan sebagai soalan hukum hakam (lihat fiqhDetection.ts).
// Warn-first-still-allow: tak block sepenuhnya, pengguna kekal boleh hantar
// juga kalau soalan mereka disalah anggap.
export default function FiqhWarningBar({ onSendAnyway, onEdit }: { onSendAnyway: () => void; onEdit: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-[#c9a96e14] border border-[#c9a96e40] rounded-2xl">
      <AlertTriangle size={15} className="text-[#c9a96e] flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <p className="text-[#e8dcc8] text-xs leading-relaxed">{t('umum.fiqh_warning')}</p>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#c9a96e20] text-[#c9a96e] hover:bg-[#c9a96e30] transition-colors"
          >
            {t('umum.fiqh_warning_ubah')}
          </button>
          <button
            onClick={onSendAnyway}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#8a7a65] hover:text-[#e8dcc8] transition-colors"
          >
            {t('umum.fiqh_warning_hantar')}
          </button>
        </div>
      </div>
    </div>
  )
}
