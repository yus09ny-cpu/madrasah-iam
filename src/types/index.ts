export type UserTier = 'free' | 'pro' | 'family'
export type AppLanguage = 'bm' | 'en' | 'ar' | 'id'

export type UserMaqam = 'islam' | 'iman' | 'ihsan'

export interface User {
  id: string
  email: string
  name: string | null
  nickname?: string | null
  gender?: 'male' | 'female' | null
  age?: number | null
  country?: string | null
  state?: string | null
  education_level?: string | null
  religious_background?: string | null
  language?: AppLanguage | null
  tier: UserTier
  maqam?: UserMaqam | null
  avatar_url?: string | null
  onboarding_complete?: boolean | null
  talqin_jahar?: boolean | null
  talqin_khafi?: boolean | null
  solat_tarekat_unlocked?: boolean | null
  solat_hakikat_unlocked?: boolean | null
  darajat_activated?: boolean | null
  created_at: string
}

export interface TalqinRequest {
  id: string
  user_id: string
  zikir_type: 'jahar' | 'khafi'
  full_name: string
  phone: string
  location: string
  preferred_time: string
  language: string
  notes?: string | null
  status: 'pending' | 'contacted' | 'completed' | 'cancelled'
  talqin_completed: boolean
  created_at: string
}

export interface MuhasabahEntry {
  id: string
  user_id: string
  date: string
  answers: MuhasabahAnswer[]
  mood: 1 | 2 | 3 | 4 | 5
  created_at: string
}

export interface MuhasabahAnswer {
  question_id: number
  question: string
  answer: string
}

export interface ZikirSession {
  id: string
  user_id: string
  type: 'jahar' | 'khafi'
  zikir_name: string
  count: number
  target: number
  completed: boolean
  date: string
  created_at: string
}

export interface SolatEntry {
  id: string
  user_id: string
  date: string
  prayers: PrayerRecord[]
  created_at: string
}

export interface PrayerRecord {
  name: 'Subuh' | 'Zohor' | 'Asar' | 'Maghrib' | 'Isyak'
  completed: boolean
  time?: string
  reflection?: string
  on_time: boolean
  quality?: number
  checklist?: boolean[]
  khusyuk_percent?: number
  perasaan?: string
  azam?: string
  wirid_done?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
