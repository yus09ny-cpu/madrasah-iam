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
    }
  }
}
