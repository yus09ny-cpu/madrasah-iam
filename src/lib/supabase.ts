import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL dan Anon Key diperlukan. Sila semak fail .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // Dimatikan: auto-detection dalaman bergantung pada mekanisme yang sama
    // dengan getSession() yang hang dalam projek ini — di-exchange manual dalam useAuth.ts
    detectSessionInUrl: false,
    storageKey: 'madrasah-iam-auth',
  },
})
