import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { BannedUser } from '../types/moderation'

export function useBannedUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation', 'banned-users'],
    queryFn: (): Promise<BannedUser[]> => moderationApi.getBannedUsers(),
    enabled,
    staleTime: 10_000,
  })
}
