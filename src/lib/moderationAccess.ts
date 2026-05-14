import { moderationApi } from './moderationApi'

export const moderationAccessQueryKey = ['moderation', 'access-check'] as const
export const anonymousModerationAccessQueryKey = [...moderationAccessQueryKey, 'anonymous'] as const

export function getModerationAccessQueryKey(userId: string) {
  return [...moderationAccessQueryKey, userId] as const
}

function resolveSignal(
  context?: AbortSignal | { signal?: AbortSignal } | null,
): AbortSignal | undefined {
  if (context instanceof AbortSignal) {
    return context
  }

  return context?.signal
}

export function fetchModeratorAccess(context?: AbortSignal | { signal?: AbortSignal }) {
  return moderationApi.getReports(resolveSignal(context))
}
