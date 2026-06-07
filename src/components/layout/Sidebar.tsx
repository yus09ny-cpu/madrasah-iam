import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookHeart, Sparkles, Clock, MessageCircle, LogOut, Heart, Bell, Star, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'

type SidebarItem =
  | { to: string; icon: React.ComponentType<{ size?: number }>; emoji?: never; label: string }
  | { to: string; icon?: never; emoji: string; label: string }

const BASE_NAV_ITEMS: SidebarItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Ruang Utama' },
  { to: '/muhasabah', icon: BookHeart, label: 'Audit Jiwa' },
  { to: '/zikir', icon: Sparkles, label: 'Zikir' },
  { to: '/solat', icon: Clock, label: 'Solat' },
  { to: '/iam', icon: MessageCircle, label: 'I AM' },
  { to: '/hablum', icon: Heart, label: 'Hablum' },
  { to: '/rezeki', emoji: '🗝️', label: 'Pintu Rezeki' },
]

const AMALAN_ITEM: SidebarItem = { to: '/amalan', icon: Star, label: 'Amalan TQN' }

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()

  const navItems = user?.talqin_jahar ? [...BASE_NAV_ITEMS, AMALAN_ITEM] : BASE_NAV_ITEMS

  const NAV_LABELS: Record<string, string> = {
    '/dashboard': t('nav.utama'),
    '/muhasabah': t('nav.audit_jiwa'),
    '/zikir': t('nav.zikir'),
    '/solat': t('nav.solat'),
    '/iam': t('nav.iam'),
    '/hablum': t('nav.hablum'),
    '/rezeki': t('nav.pintu_rezeki'),
    '/amalan': t('nav.amalan'),
  }

  const displayName = user?.nickname ?? user?.name ?? 'Sahabat'
  const initial = displayName.charAt(0).toUpperCase()
  const tierLabel =
    user?.tier === 'pro' ? '✦ Pro' :
    user?.tier === 'family' ? '✦ Keluarga' :
    'Percuma'

  async function handleLogout() {
    try {
      // Jangan biar signOut() yang tergantung (cth. disekat oleh extension browser)
      // menghalang pengguna daripada log keluar secara tempatan
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 4000)),
      ])
    } catch (err) {
      console.error('[Sidebar] signOut gagal/timeout:', err)
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <aside className="w-64 h-full flex flex-col border-r border-[#1e2d40] bg-[#0d1821]">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e2d40]">
        <h1 className="font-serif text-xl font-semibold text-[#c9a96e]">Madrasah I AM</h1>
        <p className="text-xs text-[#8a7a65] mt-1">Perjalanan Rohani</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200',
                isActive
                  ? 'bg-[#c9a96e15] text-[#c9a96e] border border-[#c9a96e30]'
                  : 'text-[#8a7a65] hover:text-[#e8dcc8] hover:bg-[#1a2535]'
              )
            }
          >
            {item.icon
              ? <item.icon size={18} />
              : <span className="text-base leading-none w-[18px] text-center">{item.emoji}</span>
            }
            <span>{NAV_LABELS[item.to] ?? item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-[#1e2d40] space-y-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1a2535]">
          <div className="w-8 h-8 rounded-full bg-[#c9a96e30] flex items-center justify-center text-[#c9a96e] text-sm font-semibold flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#e8dcc8] truncate">{displayName}</p>
            <p className="text-xs text-[#c9a96e]">{tierLabel}</p>
          </div>
        </div>
        <NavLink to="/settings/notifications"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
            isActive ? 'text-[#c9a96e]' : 'text-[#8a7a65] hover:text-[#e8dcc8] hover:bg-[#1a2535]'
          )}>
          <Bell size={16} />
          <span>{t('nav.notifikasi')}</span>
        </NavLink>
        <NavLink to="/admin"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
            isActive ? 'text-[#c9a96e]' : 'text-[#8a7a65] hover:text-[#e8dcc8] hover:bg-[#1a2535]'
          )}>
          <Shield size={16} />
          <span>Admin</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[#8a7a65] hover:text-red-400 hover:bg-red-900/10 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>{t('nav.tinggalkan')}</span>
        </button>
      </div>
    </aside>
  )
}
