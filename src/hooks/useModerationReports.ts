import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { ModerationReport } from '../types/moderation'

export function useModerationReports(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation', 'reports'],
    queryFn: ({ signal }): Promise<ModerationReport[]> => moderationApi.getReports(signal),
    enabled,
    staleTime: 10_000,
  })
}
