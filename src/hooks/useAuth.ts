import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import i18n from '@/lib/i18n'

// Sesetengah panggilan Supabase boleh tergantung tanpa resolve/reject
// (sama seperti signOut di Sidebar.tsx) — race dengan timeout supaya
// UI tak terus berputar selama-lamanya.
function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ])
}

// Fungsi tindakan auth — taburkan ke mana-mana komponen tanpa memulakan
// subscription/sync baharu (elak race condition bila dipanggil dari
// pelbagai tempat seperti LoginPage dan AppRoutes serentak).
export async function signIn(email: string, password: string) {
  const { error } = await withTimeout(
    supabase.auth.signInWithPassword({ email, password }),
    10000,
    'signIn',
  )
  if (error) throw error
}

export async function signUp(email: string, password: string, name: string) {
  const { error } = await withTimeout(
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    }),
    10000,
    'signUp',
  )
  if (error) throw error
}

export async function resendConfirmation(email: string) {
  const { error } = await withTimeout(
    supabase.auth.resend({ type: 'signup', email }),
    10000,
    'resendConfirmation',
  )
  if (error) throw error
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  })
  if (error) {
    console.error('Google auth error:', error)
    throw error
  }
}

export async function signOut() {
  try {
    await withTimeout(supabase.auth.signOut(), 4000, 'signOut')
  } catch (err) {
    console.error('signOut gagal/timeout:', err)
  } finally {
    useAuthStore.getState().logout()
  }
}

// Hook utama — memulakan subscription onAuthStateChange + sync profil.
// PENTING: panggil hook ini di SATU tempat sahaja (App.tsx/AppRoutes).
// Komponen lain yang cuma perlukan signIn/signUp/dll boleh import terus
// fungsi di atas, supaya tak timbul subscription berganda yang
// menyebabkan race condition pada baris `profiles` yang sama.
// onAuthStateChange boleh tembak INITIAL_SESSION dan SIGNED_IN serentak untuk
// pengguna yang sama (terutama semasa daftar/log masuk baharu) — tanpa
// dedup ini, dua syncProfile() berlumba mencipta row 'profiles' yang sama
// dan salah satu gagal dengan ralat duplicate-key (23505).
const inFlightProfileSyncs = new Map<string, Promise<void>>()

export function useAuth() {
  const { user, isAuthenticated, setUser, logout } = useAuthStore()

  // Returning users (persisted session) skip the loading spinner.
  // New visitors start with loading = true until session check completes.
  const [loading, setLoading] = useState(!isAuthenticated)

  useEffect(() => {
    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            await syncProfile(
              session.user.id,
              session.user.email ?? '',
              session.user.user_metadata?.name as string | undefined,
            )
          } else {
            logout()
            setLoading(false)
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          await syncProfile(
            session.user.id,
            session.user.email ?? '',
            session.user.user_metadata?.name as string | undefined,
          )
        } else if (event === 'SIGNED_OUT') {
          logout()
          setLoading(false)
        }
      }
    )

    // Safety net: never stay loading more than 6 seconds
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 6000)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function syncProfile(userId: string, email: string, metaName?: string) {
    const inFlight = inFlightProfileSyncs.get(userId)
    if (inFlight) {
      await inFlight
      return
    }
    const promise = syncProfileImpl(userId, email, metaName).finally(() => {
      inFlightProfileSyncs.delete(userId)
    })
    inFlightProfileSyncs.set(userId, promise)
    await promise
  }

  async function syncProfileImpl(userId: string, email: string, metaName?: string) {
    try {
      const { data: profile } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        10000,
        'profile fetch',
      )

      if (profile) {
        // 'email' bukan lajur dalam jadual 'profiles' — ia datang dari
        // auth.users, jadi cantumkan secara eksplisit di sini.
        const merged = { ...(profile as object), email } as User
        setUser(merged)
        if (merged.language) {
          i18n.changeLanguage(merged.language as string)
          localStorage.setItem('madrasah_language', merged.language as string)
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newProfile, error: insertError } = await (supabase.from('profiles') as any)
          .insert({
            id: userId,
            name: metaName ?? null,
            tier: 'free',
            onboarded: false,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Profile insert error:', insertError)
          // '23505' = row sudah wujud (race — proses lain berjaya cipta profil
          // serentak). Row itu PASTI wujud, jadi cuba baca semula beberapa kali
          // dengan jeda — elak terus guna fallback onboarded:false yang akan
          // hantar user ke onboarding walaupun profil sebenar sudah lengkap.
          const isDuplicateKey = (insertError as { code?: string })?.code === '23505'
          const attempts = isDuplicateKey ? 4 : 1
          for (let i = 0; i < attempts; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 350 * i))
            const { data: existing } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle()
            if (existing) {
              setUser({ ...(existing as object), email } as User)
              return
            }
          }
        }

        setUser(
          newProfile
            ? ({ ...(newProfile as object), email } as User)
            : {
                id: userId,
                email,
                name: metaName ?? null,
                tier: 'free',
                onboarded: false,
                created_at: new Date().toISOString(),
              },
        )
      }
    } catch (err) {
      console.error('syncProfile error:', err)
      // profiles table not yet created — set minimal user, skip onboarding
      setUser({
        id: userId,
        email,
        name: metaName ?? null,
        tier: 'free',
        onboarded: true,
        created_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return { user, isAuthenticated, loading, signIn, signUp, signInWithGoogle, signOut, resendConfirmation }
}
