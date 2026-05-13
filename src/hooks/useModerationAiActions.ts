import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { ModerationAction } from '../types/moderation'
import { useSession } from './useSession'

export function useModerationAiActions(enabled: boolean) {
  const { data: session } = useSession()
  const userId = session?.user.id ?? 'anonymous'

  return useQuery({
    queryKey: ['moderation', 'ai-actions', userId],
    queryFn: (): Promise<ModerationAction[]> => moderationApi.getAiActions(),
    enabled: enabled && !!session,
    staleTime: 10_000,
  })
}
