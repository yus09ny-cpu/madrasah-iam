import { useNavigate } from 'react-router-dom'
import { Shield, Gauge } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import ApiUsageDashboard from '@/components/admin/ApiUsageDashboard'

function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-600/30 flex items-center justify-center">
        <Shield size={24} className="text-red-400" />
      </div>
      <div className="space-y-2">
        <h1 className="font-serif text-xl text-[#e8dcc8]">Akses Ditolak</h1>
        <p className="text-[#8a7a65] text-sm leading-relaxed max-w-xs">
          Halaman ini hanya untuk pentadbir yang telah diberi kebenaran oleh Master Admin.
        </p>
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-5 py-2.5 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors"
      >
        ← Kembali ke Dashboard
      </button>
    </div>
  )
}

export default function AdminUsagePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  if (!user) return null

  const hasAccess = user.role === 'master_admin' || user.role === 'super_admin'
  if (!hasAccess) return <AccessDenied />

  return (
    <div className="min-h-full px-4 py-8 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
          <Gauge size={18} className="text-[#c9a96e]" />
        </div>
        <div>
          <h1 className="text-[#e8dcc8] font-semibold text-lg">Penggunaan API</h1>
          <p className="text-[#8a7a65] text-xs">Kos & token Anthropic API mengikut pengguna dan ciri-ciri</p>
        </div>
      </div>

      <ApiUsageDashboard />

      <button
        onClick={() => navigate(-1)}
        className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors"
      >
        ← Kembali
      </button>
    </div>
  )
}
