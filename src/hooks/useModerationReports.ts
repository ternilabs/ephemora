import { useQuery } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'
import type { ModerationReport } from '../types/moderation'
import { useSession } from './useSession'

export function useModerationReports(enabled: boolean) {
  const { data: session } = useSession()
  const userId = session?.user.id ?? 'anonymous'

  return useQuery({
    queryKey: ['moderation', 'reports', userId],
    queryFn: (): Promise<ModerationReport[]> => moderationApi.getReports(),
    enabled: enabled && !!session,
    staleTime: 10_000,
  })
}
