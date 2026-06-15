import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

export default function PaymentSuccessPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [upgraded, setUpgraded] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!user) {
      setChecking(false)
      return
    }

    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      const profile = data as unknown as Partial<User> | null
      if (profile && profile.tier !== 'free') {
        setUser({ ...user, ...profile })
        setUpgraded(true)
        setChecking(false)
        clearInterval(interval)
      } else if (attempts >= 6) {
        setChecking(false)
        clearInterval(interval)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [user, setUser])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060d16] px-6 text-center space-y-5">
      {checking ? (
        <>
          <Loader2 size={32} className="animate-spin text-[#c9a96e]" />
          <p className="text-[#e8dcc8] text-sm">Mengesahkan pembayaran anda...</p>
        </>
      ) : upgraded ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-[#c9a96e20] border border-[#c9a96e40] flex items-center justify-center">
            <CheckCircle2 size={28} className="text-[#c9a96e]" />
          </div>
          <div className="space-y-2">
            <p className="font-serif text-[#c9a96e] text-lg">Pembayaran Berjaya</p>
            <p className="text-[#8a7a65] text-sm leading-relaxed max-w-xs">
              Akaun anda telah dinaik taraf. Terima kasih kerana menyokong Madrasah I AM.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-[#c9a96e20] border border-[#c9a96e40] flex items-center justify-center">
            <CheckCircle2 size={28} className="text-[#c9a96e]" />
          </div>
          <div className="space-y-2">
            <p className="font-serif text-[#c9a96e] text-lg">Pembayaran Diterima</p>
            <p className="text-[#8a7a65] text-sm leading-relaxed max-w-xs">
              Akses Pro anda sedang diproses dan akan aktif dalam beberapa minit.
            </p>
          </div>
        </>
      )}

      <button
        onClick={() => navigate('/dashboard')}
        className="px-8 py-3 bg-[#c9a96e20] border border-[#c9a96e40] text-[#c9a96e] rounded-2xl font-medium text-sm hover:bg-[#c9a96e30] transition-colors"
      >
        Kembali ke Dashboard
      </button>
    </div>
  )
}
