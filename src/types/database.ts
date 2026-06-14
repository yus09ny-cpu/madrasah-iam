// Auto-generated types untuk Supabase — jana semula dengan: npx supabase gen types typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          nickname: string | null
          age: number | null
          country: string | null
          state: string | null
          education_level: string | null
          religious_background: string | null
          language: 'bm' | 'en' | null
          tier: 'free' | 'pro' | 'family'
          onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          nickname?: string | null
          age?: number | null
          country?: string | null
          state?: string | null
          education_level?: string | null
          religious_background?: string | null
          language?: 'bm' | 'en' | null
          tier?: 'free' | 'pro' | 'family'
          onboarded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      muhasabah_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          answers: Json
          mood: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          answers: Json
          mood: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['muhasabah_entries']['Insert']>
      }
      zikir_sessions: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          type: 'jahar' | 'khafi'
          zikir_name: string
          count?: number
          target: number
          completed?: boolean
          date: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['zikir_sessions']['Insert']>
      }
      solat_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          prayers: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          prayers: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['solat_entries']['Insert']>
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
      }
      renungan_entries: {
        Row: {
          id: string
          user_id: string
          soalan: string
          jawapan: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          soalan: string
          jawapan: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['renungan_entries']['Insert']>
      }
      api_usage_logs: {
        Row: {
          id: string
          user_id: string
          user_type: string
          feature: string
          tokens_used: number
          model: string
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_type: string
          feature: string
          tokens_used: number
          model: string
          cost_usd: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['api_usage_logs']['Insert']>
      }
      audit_jiwa_entries: {
        Row: {
          id: string
          user_id: string
          tarikh: string
          pillar_raga: number
          pillar_hati: number
          pillar_akal: number
          pillar_ruh: number
          jumlah_skor: number
          cadangan_ai: string | null
          soalan_dijawab: number
          selesai: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tarikh?: string
          pillar_raga?: number
          pillar_hati?: number
          pillar_akal?: number
          pillar_ruh?: number
          jumlah_skor?: number
          cadangan_ai?: string | null
          soalan_dijawab?: number
          selesai?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_jiwa_entries']['Insert']>
      }
    }
  }
}
