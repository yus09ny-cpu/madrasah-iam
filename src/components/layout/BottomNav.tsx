import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { BASE_NAV_ITEMS, AMALAN_ITEM } from './navConfig'

export default function BottomNav() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const navItems = user?.talqin_completed
    ? [...BASE_NAV_ITEMS, AMALAN_ITEM]
    : BASE_NAV_ITEMS

  async function handleLogout() {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ])
    } catch { /* ignore */ }
    finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0d1821] border-t border-[#1e2d40] z-50 overflow-x-auto"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex min-w-max px-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 pt-2 pb-1 min-w-[52px] min-h-[44px] rounded-xl transition-all flex-shrink-0',
                isActive ? 'text-[#c9a96e]' : 'text-[#8a7a65]'
              )
            }
          >
            {item.icon
              ? <item.icon size={22} />
              : <span className="text-[20px] leading-none">{item.emoji}</span>
            }
            <span className="text-[9px] leading-tight whitespace-nowrap">
              {t(item.labelKey, item.label)}
            </span>
          </NavLink>
        ))}

        {/* Logout — last item, subtle red, requires scroll to reach */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 pt-2 pb-1 min-w-[52px] min-h-[44px] rounded-xl transition-all flex-shrink-0 text-[#8a7a65] active:text-red-400"
        >
          <LogOut size={22} />
          <span className="text-[9px] leading-tight whitespace-nowrap">
            {t('nav.tinggalkan', 'Keluar').split(' ')[0]}
          </span>
        </button>
      </div>
    </nav>
  )
}
