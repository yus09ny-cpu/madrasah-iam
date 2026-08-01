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
          role: 'master_admin' | 'super_admin' | 'wakil_talkin' | 'user' | null
          talqin_completed: boolean | null
          subscription_tier: 'free' | 'pro' | 'pro_plus' | null
          subscription_expiry: string | null
          last_reminder_sent: string | null
          referral_code: string | null
          onboarded: boolean
          mod_hamba_active: boolean
          mod_hamba_suggested_at: string | null
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
          role?: 'master_admin' | 'super_admin' | 'wakil_talkin' | 'user' | null
          talqin_completed?: boolean | null
          subscription_tier?: 'free' | 'pro' | 'pro_plus' | null
          subscription_expiry?: string | null
          last_reminder_sent?: string | null
          referral_code?: string | null
          onboarded?: boolean
          mod_hamba_active?: boolean
          mod_hamba_suggested_at?: string | null
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
      payment_events: {
        Row: {
          id: string
          billcode: string | null
          order_id: string | null
          status_id: string | null
          amount: number
          transaction_id: string | null
          matched_profile_id: string | null
          subscription_tier_applied: string | null
          outcome: string
          raw_form: Json
          created_at: string
        }
        Insert: {
          id?: string
          billcode?: string | null
          order_id?: string | null
          status_id?: string | null
          amount: number
          transaction_id?: string | null
          matched_profile_id?: string | null
          subscription_tier_applied?: string | null
          outcome: string
          raw_form: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payment_events']['Insert']>
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string | null
          referral_code: string
          status: 'pending' | 'active' | 'churned'
          activated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id?: string | null
          referral_code: string
          status?: 'pending' | 'active' | 'churned'
          activated_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>
      }
      soal_hati_sessions: {
        Row: {
          id: string
          user_id: string
          bab_id: string
          langkah_terakhir: number
          jawapan_checkpoint: Json
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bab_id: string
          langkah_terakhir?: number
          jawapan_checkpoint?: Json
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['soal_hati_sessions']['Insert']>
      }
    }
  }
}
