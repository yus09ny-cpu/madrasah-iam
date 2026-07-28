import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import KhafiHistoryPanel from '@/components/zikir/KhafiHistoryPanel'

// "Boleh dicari, tak auto-papar" — bungkus KhafiHistoryPanel sedia ada
// (tak diubah) supaya semasa Mod Hamba aktif, graf/sejarah masih boleh
// diakses bila pengguna sengaja cari, tapi tak lagi auto-papar di Dashboard.
export default function ModHambaHistoryModal({ userId, isPro, onUpgrade, onClose }: {
  userId: string
  isPro: boolean
  onUpgrade: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div
        className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full max-h-[80vh] overflow-y-auto space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-[#e8dcc8] font-serif font-medium">{t('amalan.khafi_player.riwayat_tajuk')}</p>
          <button onClick={onClose} className="text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
            <X size={18} />
          </button>
        </div>
        <KhafiHistoryPanel userId={userId} isPro={isPro} onUpgrade={onUpgrade} />
      </div>
    </div>
  )
}
