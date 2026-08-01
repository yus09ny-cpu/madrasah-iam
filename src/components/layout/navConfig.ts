import { LayoutDashboard, BookHeart, Compass, Sparkles, Clock, MessageCircle, Heart, Settings } from 'lucide-react'
import type { ComponentType } from 'react'

export type NavItem =
  | { to: string; icon: ComponentType<{ size?: number }>; emoji?: never; labelKey: string; label: string }
  | { to: string; icon?: never; emoji: string; labelKey: string; label: string }

// Ordered by mobile priority: most-used first
export const BASE_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',              icon: LayoutDashboard, labelKey: 'nav.utama',        label: 'Utama'          },
  { to: '/iam',                    icon: MessageCircle,   labelKey: 'nav.iam',           label: 'I AM'           },
  { to: '/audit-jiwa',             icon: BookHeart,       labelKey: 'nav.audit_jiwa',    label: 'Audit Jiwa'     },
  { to: '/soal-hati',              icon: Compass,         labelKey: 'nav.soal_hati',     label: 'Soal Hati'      },
  { to: '/zikir',                  icon: Sparkles,        labelKey: 'nav.zikir',         label: 'Zikir'          },
  { to: '/solat',                  icon: Clock,           labelKey: 'nav.solat',         label: 'Solat'          },
  { to: '/hablum',                 icon: Heart,           labelKey: 'nav.hablum',        label: 'Hablum'         },
  { to: '/rezeki',                 emoji: '🗝️',           labelKey: 'nav.pintu_rezeki',  label: 'Rezeki'         },
  { to: '/settings/notifications', icon: Settings,        labelKey: 'nav.tetapan',       label: 'Tetapan'        },
]

export const AMALAN_ITEM: NavItem = {
  to: '/amalan', emoji: '✦', labelKey: 'nav.amalan', label: 'Amalan TQN',
}
