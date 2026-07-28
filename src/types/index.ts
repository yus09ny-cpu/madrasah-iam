export type UserTier = 'free' | 'pro' | 'family'
export type AppLanguage = 'bm' | 'en' | 'ar' | 'id'
export type AdminRole = 'user' | 'master_admin' | 'super_admin' | 'wakil_talkin'

export interface User {
  id: string
  // Email tidak disimpan dalam jadual 'profiles' — diambil terus dari
  // auth.users (session.user.email) dan dicantum ke objek User di klien.
  email: string
  name: string | null
  nickname?: string | null
  age?: number | null
  country?: string | null
  state?: string | null
  education_level?: string | null
  religious_background?: string | null
  language?: AppLanguage | null
  tier: UserTier
  role?: AdminRole | null
  referral_code?: string | null
  onboarded?: boolean | null
  talqin_completed?: boolean | null
  solat_tarekat_unlocked?: boolean | null
  solat_hakikat_unlocked?: boolean | null
  darajat_activated?: boolean | null
  mod_hamba_active?: boolean | null
  mod_hamba_suggested_at?: string | null
  created_at: string
}

// ─── Admin types ──────────────────────────────────────────────────────────────

export interface WakilTalkinRecord {
  id: string
  name: string
  email: string
  phone: string | null
  bio: string | null
  specialization: 'beginner' | 'advanced' | 'specific_issues' | null
  languages: string | null
  availability_status: 'available' | 'full' | 'on_leave'
  max_students: number
  current_students: number
  contact_methods: string | null
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface UserWakilTalkinRecord {
  id: string
  user_id: string
  wakil_talkin_id: string
  audit_id: string | null
  talkin_status: 'pending' | 'active' | 'completed' | 'paused'
  talkin_start_date: string | null
  talkin_completion_date: string | null
  talkin_sessions_count: number
  talkin_notes: string | null
  amalan_status: 'not_started' | 'in_progress' | 'completed'
  amalan_start_date: string | null
  amalan_completion_date: string | null
  amalan_weeks_completed: number
  amalan_notes: string | null
  pro_unlocked_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface TalkinSessionRecord {
  id: string
  assignment_id: string
  user_id: string
  wakil_talkin_id: string
  session_date: string
  duration_minutes: number | null
  topic: string | null
  notes: string | null
  user_feedback: string | null
  next_session_date: string | null
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
