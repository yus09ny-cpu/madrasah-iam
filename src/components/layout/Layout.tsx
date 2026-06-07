import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X, FlaskConical } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MicroMoment from '@/components/MicroMoment'
import KhusyukZone from '@/components/KhusyukZone'

// ─── Beta Banner ─────────────────────────────────────────────────────────────

function BetaBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('madrasah-beta-banner-dismissed') === '1'
  )

  if (dismissed) return null

  function dismiss() {
    localStorage.setItem('madrasah-beta-banner-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-[#c9a96e]/10 border-b border-[#c9a96e]/20 px-4 py-2 text-xs shrink-0">
      <div className="flex items-center gap-2 text-[#c9a96e]">
        <FlaskConical size={13} className="shrink-0" />
        <span className="font-semibold tracking-wide uppercase text-[10px]">Beta</span>
        <span className="text-[#8a7a65]">—</span>
        <span className="text-[#a89070]">Aplikasi ini masih dalam pembangunan. Maklum balas anda amat dihargai.</span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Tutup"
        className="text-[#8a7a65] hover:text-[#c9a96e] transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  return (
    <div className="flex bg-[#060d16] text-[#e8dcc8]" style={{ height: '100dvh' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <BetaBanner />
        <main className="flex-1 overflow-y-auto md:pb-0" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — fixed positioned */}
      <div className="md:hidden">
        <BottomNav />
      </div>

      {/* Zon Khusyuk — banner lembut atas */}
      <KhusyukZone />

      {/* Satu Minit Sebelum Bergerak — floating on all pages */}
      <MicroMoment />

    </div>
  )
}
