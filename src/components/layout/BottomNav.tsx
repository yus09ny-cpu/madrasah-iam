import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'
import { BASE_NAV_ITEMS, AMALAN_ITEM } from './navConfig'

export default function BottomNav() {
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const navItems = user?.talqin_completed
    ? [...BASE_NAV_ITEMS, AMALAN_ITEM]
    : BASE_NAV_ITEMS

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
      </div>
    </nav>
  )
}
