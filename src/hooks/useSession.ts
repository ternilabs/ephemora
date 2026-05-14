import { useEffect } from 'react'
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { getModerationAccessQueryKey, moderationAccessQueryKey } from '../lib/moderationAccess'
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

  let previousUserId = queryClient.getQueryData<Session | null>(sessionQueryKey)?.user.id ?? null
  let moderationPurgeQueue = Promise.resolve()

  const purgeModerationCaches = (
    accessQueryKey?: ReturnType<typeof getModerationAccessQueryKey>,
  ): Promise<void> => {
    moderationPurgeQueue = moderationPurgeQueue
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.warn('Failed to purge moderation cache queue', error)
        }
      })
      .then(async () => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: moderationAccessQueryKey }),
          queryClient.cancelQueries({ queryKey: ['moderation'] }),
        ])

        if (accessQueryKey) {
          queryClient.removeQueries({ queryKey: accessQueryKey, exact: true })
        } else {
          queryClient.removeQueries({ queryKey: moderationAccessQueryKey })
        }
        queryClient.removeQueries({ queryKey: ['moderation'] })
      })

    return moderationPurgeQueue
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    queryClient.setQueryData(sessionQueryKey, session)

    const currentUserId = session?.user.id ?? null

    if (previousUserId !== currentUserId) {
      previousUserId = currentUserId
      void purgeModerationCaches()
    }

    if (
      previousUserId === currentUserId &&
      currentUserId &&
      (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
    ) {
      void purgeModerationCaches(getModerationAccessQueryKey(currentUserId))
    }
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
