import { useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { MessagesPage } from '../types/chat'

export function useMessageHistory(limit: number) {
  return useInfiniteQuery({
    queryKey: ['messages', 'history', limit],
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      const cursor = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''
      return apiFetch<MessagesPage>(`/messages?limit=${limit}${cursor}`)
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5_000,
  })
}
