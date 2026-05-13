import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moderationApi } from '../lib/moderationApi'

export function useModerationActions() {
  const queryClient = useQueryClient()

  const invalidateReports = async () => {
    await queryClient.invalidateQueries({ queryKey: ['moderation', 'reports'] })
  }

  const invalidateBannedUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['moderation', 'banned-users'] })
  }

  return {
    hideMessage: useMutation({
      mutationFn: (id: string) => moderationApi.hideMessage(id),
      onSuccess: invalidateReports,
    }),
    restoreMessage: useMutation({
      mutationFn: (id: string) => moderationApi.restoreMessage(id),
      onSuccess: invalidateReports,
    }),
    markReviewed: useMutation({
      mutationFn: (id: string) => moderationApi.markReviewed(id),
      onSuccess: invalidateReports,
    }),
    banUser: useMutation({
      mutationFn: (args: { id: string; reason?: string }) =>
        moderationApi.banUser(args.id, args.reason),
      onSuccess: invalidateBannedUsers,
    }),
    unbanUser: useMutation({
      mutationFn: (id: string) => moderationApi.unbanUser(id),
      onSuccess: invalidateBannedUsers,
    }),
  }
}
