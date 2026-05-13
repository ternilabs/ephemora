import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import { useSession } from './useSession'

export function useModerator() {
  const { data: session, isLoading: sessionLoading } = useSession()
  const userId = session?.user.id ?? 'anonymous'

  const { isError, isLoading } = useQuery({
    queryKey: ['moderation', 'access-check', userId],
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
