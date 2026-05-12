import { useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { MessagesPage } from '../types/chat'

export function useMessageHistory(limit: number) {
  return useInfiniteQuery({
    queryKey: ['messages', 'history', limit],
    queryFn: ({ pageParam, signal }: { pageParam: string | null; signal: AbortSignal }) => {
      const cursor = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''
      return apiFetch<MessagesPage>(`/messages?limit=${limit}${cursor}`, { signal })
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    maxPages: 10,
    staleTime: 5_000,
  })
}
