import { useQuery } from '@tanstack/react-query'
import { ModerationApiError, moderationApi } from '../lib/moderationApi'
import { useSession } from './useSession'

export function useModerator() {
  const { data: session, isLoading: sessionLoading } = useSession()

  const accessCheck = useQuery({
    queryKey: ['moderation', 'access-check'],
    queryFn: () => moderationApi.getReports(),
    enabled: !!session,
    retry: false,
    staleTime: 30_000,
  })

  const hasVerifiedAccess = accessCheck.data !== undefined
  const error = accessCheck.error
  const isForbiddenError =
    error instanceof ModerationApiError
      ? error.status === 403
      : error instanceof Error && error.message.startsWith('Moderation API 403:')

  return {
    isModerator: !!session && (accessCheck.isSuccess || hasVerifiedAccess),
    isLoading: sessionLoading || (!!session && accessCheck.isLoading),
    isForbidden: !session || (!!session && accessCheck.isError && isForbiddenError),
    isLoadFailed: !!session && accessCheck.isError && !isForbiddenError && !hasVerifiedAccess,
    isRetrying: accessCheck.isRefetching,
    retry: accessCheck.refetch,
  }
}
