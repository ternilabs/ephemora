import { useQuery } from '@tanstack/react-query'
import { ModerationApiError } from '../lib/moderationApi'
import {
  anonymousModerationAccessQueryKey,
  fetchModeratorAccess,
  getModerationAccessQueryKey,
} from '../lib/moderationAccess'
import { useSession } from './useSession'

function getDeniedModerationStatus(error: unknown): 401 | 403 | null {
  if (error instanceof ModerationApiError) {
    if (error.status === 401 || error.status === 403) {
      return error.status
    }
    return null
  }

  if (!(error instanceof Error)) {
    return null
  }

  if (error.message.startsWith('Moderation API 401:')) {
    return 401
  }

  if (error.message.startsWith('Moderation API 403:')) {
    return 403
  }

  return null
}

function hasUsableModeratorAccess(data: unknown, isError: boolean, error: unknown): boolean {
  return data !== undefined && !(isError && getDeniedModerationStatus(error) !== null)
}

export function useModerator() {
  const { data: session, isLoading: sessionLoading } = useSession()
  const userId = session?.user.id
  const queryKey = userId ? getModerationAccessQueryKey(userId) : anonymousModerationAccessQueryKey

  const accessCheck = useQuery({
    queryKey,
    queryFn: fetchModeratorAccess,
    enabled: !!session,
    retry: false,
    staleTime: 30_000,
    refetchOnMount: 'always',
  })

  const error = accessCheck.error
  const deniedStatus = getDeniedModerationStatus(error)
  const isUnauthorized = !session || (!!session && accessCheck.isError && deniedStatus === 401)
  const isForbidden = !!session && accessCheck.isError && deniedStatus === 403
  const isInitialAccessCheck = !!session && accessCheck.isPending

  return {
    isModerator: !!session && accessCheck.isSuccess,
    isLoading: sessionLoading || isInitialAccessCheck,
    isUnauthorized,
    isForbidden,
    isLoadFailed: !!session && accessCheck.isError && deniedStatus === null,
    isRetrying: accessCheck.isRefetching,
    retry: accessCheck.refetch,
  }
}

export function useModeratorAccessCache() {
  const { data: session } = useSession()
  const userId = session?.user.id
  const queryKey = userId ? getModerationAccessQueryKey(userId) : anonymousModerationAccessQueryKey

  const accessCheck = useQuery({
    queryKey,
    queryFn: fetchModeratorAccess,
    enabled: !!session,
    retry: false,
    staleTime: 300_000,
    refetchOnMount: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const isChecking = !!session && (accessCheck.isLoading || (accessCheck.isSuccess && accessCheck.isFetching))
  const isModerator =
    !!session &&
    (accessCheck.isSuccess || hasUsableModeratorAccess(accessCheck.data, accessCheck.isError, accessCheck.error))

  return { isModerator, isChecking }
}
