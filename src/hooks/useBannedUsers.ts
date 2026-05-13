import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { BannedUser } from '../types/moderation'
import { useSession } from './useSession'

export function useBannedUsers(enabled: boolean) {
  const { data: session } = useSession()
  const userId = session?.user.id ?? 'anonymous'

  return useQuery({
    queryKey: ['moderation', 'banned-users', userId],
    queryFn: (): Promise<BannedUser[]> => moderationApi.getBannedUsers(),
    enabled: enabled && !!session,
    staleTime: 10_000,
  })
}
