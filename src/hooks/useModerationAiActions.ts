import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { ModerationAction } from '../types/moderation'

export function useModerationAiActions(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation', 'ai-actions'],
    queryFn: (): Promise<ModerationAction[]> => moderationApi.getAiActions(),
    enabled,
    staleTime: 10_000,
  })
}
