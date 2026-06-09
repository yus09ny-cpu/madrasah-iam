import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookHeart, Sparkles, Clock, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'

type NavItem =
  | { to: string; icon: React.ComponentType<{ size?: number }>; emoji?: never; label: string }
  | { to: string; icon?: never; emoji: string; label: string }

const BASE_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Utama' },
  { to: '/audit-jiwa', icon: BookHeart, label: 'Audit Jiwa' },
  { to: '/zikir', icon: Sparkles, label: 'Zikir' },
  { to: '/solat', icon: Clock, label: 'Solat' },
  { to: '/rezeki', emoji: '🗝️', label: 'Rezeki' },
]

const AMALAN_ITEM: NavItem = { to: '/amalan', emoji: '✦', label: 'Amalan' }

export default function BottomNav() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const { t } = useTranslation()

  const navItems = user?.talqin_completed
    ? [...BASE_NAV_ITEMS, AMALAN_ITEM]
    : BASE_NAV_ITEMS

  const NAV_LABELS: Record<string, string> = {
    '/dashboard': t('nav.utama'),
    '/audit-jiwa': t('nav.audit_jiwa'),
    '/zikir': t('nav.zikir'),
    '/solat': t('nav.solat'),
    '/rezeki': t('nav.pintu_rezeki'),
    '/amalan': t('nav.amalan'),
  }

  async function handleLogout() {
    try {
      // Jangan biar signOut() yang tergantung (cth. disekat oleh extension browser)
      // menghalang pengguna daripada log keluar secara tempatan
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 4000)),
      ])
    } catch (err) {
      console.error('[BottomNav] signOut gagal/timeout:', err)
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0d1821] border-t border-[#1e2d40] flex justify-around z-50"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-2 pt-2 pb-1 min-w-[44px] min-h-[44px] rounded-xl transition-all',
              isActive ? 'text-[#c9a96e]' : 'text-[#8a7a65]'
            )
          }
        >
          {item.icon
            ? <item.icon size={22} />
            : <span className="text-[20px] leading-none">{item.emoji}</span>
          }
          <span className="text-[9px] leading-tight">{NAV_LABELS[item.to] ?? item.label}</span>
        </NavLink>
      ))}
      <button
        onClick={handleLogout}
        className="flex flex-col items-center gap-0.5 px-2 pt-2 pb-1 min-w-[44px] min-h-[44px] rounded-xl text-[#8a7a65] active:text-red-400 transition-colors"
      >
        <LogOut size={22} />
        <span className="text-[9px] leading-tight">{t('nav.tinggalkan').split(' ')[0]}</span>
      </button>
    </nav>
  )
}
