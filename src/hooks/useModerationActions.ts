import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'

export function useModerationActions() {
  const queryClient = useQueryClient()

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['moderation'] })
  }

  return {
    hideMessage: useMutation({
      mutationFn: (id: string) => moderationApi.hideMessage(id),
      onSuccess: invalidate,
    }),
    restoreMessage: useMutation({
      mutationFn: (id: string) => moderationApi.restoreMessage(id),
      onSuccess: invalidate,
    }),
    markReviewed: useMutation({
      mutationFn: (id: string) => moderationApi.markReviewed(id),
      onSuccess: invalidate,
    }),
    banUser: useMutation({
      mutationFn: (args: { id: string; reason?: string }) =>
        moderationApi.banUser(args.id, args.reason),
      onSuccess: invalidate,
    }),
    muteUser: useMutation({
      mutationFn: (args: { id: string; durationMinutes: number; reason?: string }) =>
        moderationApi.muteUser(args.id, args.durationMinutes, args.reason),
      onSuccess: invalidate,
    }),
    unbanUser: useMutation({
      mutationFn: (args: { supabaseUserId: string; fallbackRecordId?: string }) =>
        moderationApi.unbanUser(args.supabaseUserId, args.fallbackRecordId),
      onSuccess: invalidate,
    }),
  }
}
