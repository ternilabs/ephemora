import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './useSession'

export function useAuth() {
  const { data: session, isLoading } = useSession()

  const signInWithGoogle = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }, [])

  const signInWithGitHub = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return {
    session,
    isLoading,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
  }
}
