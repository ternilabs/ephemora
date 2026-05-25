import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { BannedUser } from '../types/moderation'

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function useBannedUsersSearch(enabled: boolean, searchQuery: string) {
  const normalizedQuery = useMemo(() => normalizeQuery(searchQuery), [searchQuery])

  return useQuery({
    queryKey: ['moderation', 'banned-users', 'search', normalizedQuery],
    queryFn: ({ signal }): Promise<BannedUser[]> => moderationApi.getBannedUsers(signal, normalizedQuery),
    enabled,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  })
}
