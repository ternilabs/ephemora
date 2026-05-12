import { useEffect } from 'react'
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const sessionQueryKey = ['session'] as const
const sessionSubscriptions = new WeakMap<
  QueryClient,
  { consumerCount: number; unsubscribe: () => void }
>()

function subscribeToSession(queryClient: QueryClient) {
  const existing = sessionSubscriptions.get(queryClient)
  if (existing) {
    existing.consumerCount += 1
    return
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    queryClient.setQueryData(sessionQueryKey, session)
  })

  sessionSubscriptions.set(queryClient, {
    consumerCount: 1,
    unsubscribe: () => data.subscription.unsubscribe(),
  })
}

function unsubscribeFromSession(queryClient: QueryClient) {
  const existing = sessionSubscriptions.get(queryClient)
  if (!existing) return

  existing.consumerCount -= 1
  if (existing.consumerCount > 0) return

  existing.unsubscribe()
  sessionSubscriptions.delete(queryClient)
}

export function useSession() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: async (): Promise<Session | null> => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    subscribeToSession(queryClient)

    return () => {
      unsubscribeFromSession(queryClient)
    }
  }, [queryClient])

  return query
}
