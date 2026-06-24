import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { BASE_NAV_ITEMS, AMALAN_ITEM } from './navConfig'

// Settings is shown in the footer section — exclude from main nav
const MAIN_NAV_ITEMS = BASE_NAV_ITEMS.filter(item => item.to !== '/settings/notifications')

export default function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const navItems = user?.talqin_completed
    ? [...MAIN_NAV_ITEMS, AMALAN_ITEM]
    : MAIN_NAV_ITEMS

  const displayName = user?.nickname ?? user?.name ?? t('umum.sahabat')
  const initial = displayName.charAt(0).toUpperCase()
  const tierLabel =
    user?.tier === 'pro' ? '✦ Pro' :
    user?.tier === 'family' ? `✦ ${t('iam.keluarga')}` :
    t('iam.percuma')

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-64 h-full flex flex-col border-r border-[#1e2d40] bg-[#0d1821]">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e2d40]">
        <h1 className="font-serif text-xl font-semibold text-[#c9a96e]">Madrasah I AM</h1>
        <p className="text-xs text-[#8a7a65] mt-1">{t('nav.perjalanan_rohani')}</p>
      </div>

      {/* Main Nav */}
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
            <span>{t(item.labelKey, item.label)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: Profile, Settings, Admin, Logout */}
      <div className="p-4 border-t border-[#1e2d40] space-y-2">
        <NavLink to="/settings/profile"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
            isActive ? 'bg-[#c9a96e15] border border-[#c9a96e30]' : 'bg-[#1a2535] hover:bg-[#1e2d40]'
          )}>
          <div className="w-8 h-8 rounded-full bg-[#c9a96e30] flex items-center justify-center text-[#c9a96e] text-sm font-semibold flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#e8dcc8] truncate">{displayName}</p>
            <p className="text-xs text-[#c9a96e]">{tierLabel}</p>
          </div>
        </NavLink>
        <NavLink to="/settings/notifications"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
            isActive ? 'text-[#c9a96e]' : 'text-[#8a7a65] hover:text-[#e8dcc8] hover:bg-[#1a2535]'
          )}>
          <Settings size={16} />
          <span>{t('nav.tetapan')}</span>
        </NavLink>
        {(user?.role === 'master_admin' || user?.role === 'super_admin' || user?.role === 'wakil_talkin') && (
          <NavLink to="/admin"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
              isActive ? 'text-[#c9a96e]' : 'text-[#8a7a65] hover:text-[#e8dcc8] hover:bg-[#1a2535]'
            )}>
            <Shield size={16} />
            <span>{user?.role === 'master_admin' ? 'Master Admin' : 'Admin'}</span>
          </NavLink>
        )}
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
