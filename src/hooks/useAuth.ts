import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './useSession'

type OAuthProvider = 'discord' | 'github'

function getRedirectTo() {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}/auth/callback`
}

export function useAuth() {
  const { data: session, isLoading } = useSession()

  const signInWithOAuth = useCallback((provider: OAuthProvider) => {
    const redirectTo = getRedirectTo()

    return supabase.auth.signInWithOAuth({
      provider,
      ...(redirectTo ? { options: { redirectTo } } : {}),
    })
  }, [])

  const signInWithDiscord = useCallback(() => {
    return signInWithOAuth('discord')
  }, [signInWithOAuth])

  const signInWithGitHub = useCallback(() => {
    return signInWithOAuth('github')
  }, [signInWithOAuth])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return {
    session,
    isLoading,
    signInWithDiscord,
    signInWithGitHub,
    signOut,
  }
}
