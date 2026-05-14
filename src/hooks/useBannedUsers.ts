import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { BannedUser } from '../types/moderation'

export function useBannedUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation', 'banned-users'],
    queryFn: ({ signal }): Promise<BannedUser[]> => moderationApi.getBannedUsers(signal),
    enabled,
    staleTime: 10_000,
  })
}
