import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import { useSession } from './useSession'

export function useModerator() {
  const queryClient = useQueryClient()
  const { data: session, isLoading: sessionLoading } = useSession()
  const previousUserId = useRef<string | null>(session?.user.id ?? null)

  useEffect(() => {
    const currentUserId = session?.user.id ?? null
    if (previousUserId.current !== currentUserId) {
      void queryClient.removeQueries({ queryKey: ['moderation'] })
      previousUserId.current = currentUserId
    }
  }, [queryClient, session?.user.id])

  const { isError, isLoading } = useQuery({
    queryKey: ['moderation', 'access-check'],
    queryFn: () => moderationApi.getReports(),
    enabled: !!session,
    retry: false,
    staleTime: 30_000,
  })

  return {
    isModerator: !isError && !!session,
    isLoading: sessionLoading || isLoading,
  }
}
