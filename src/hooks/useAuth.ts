import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import i18n from '@/lib/i18n'

export function useAuth() {
  // Single store call — destructure everything needed here
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
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profile) {
        setUser(profile as User)
        if ((profile as User).language) {
          i18n.changeLanguage((profile as User).language as string)
          localStorage.setItem('madrasah_language', (profile as User).language as string)
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newProfile } = await (supabase.from('profiles') as any)
          .insert({
            id: userId,
            email,
            name: metaName ?? null,
            tier: 'free',
            onboarding_complete: false,
          })
          .select()
          .single()
        if (newProfile) setUser(newProfile as User)
      }
    } catch {
      // profiles table not yet created — set minimal user, skip onboarding
      setUser({
        id: userId,
        email,
        name: metaName ?? null,
        tier: 'free',
        onboarding_complete: true,
        created_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) {
      console.error('Google auth error:', error)
      throw error
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    logout()
  }

  return { user, isAuthenticated, loading, signIn, signUp, signInWithGoogle, signOut }
}
