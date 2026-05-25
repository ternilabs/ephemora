import { Loader, Stack, Text } from '@mantine/core'
import { Inbox } from 'lucide-react'
import { useBannedUsers } from '../../hooks/useBannedUsers'
import { useModerationActions } from '../../hooks/useModerationActions'
import { useModerationReports } from '../../hooks/useModerationReports'
import ModerationEmptyState from './ModerationEmptyState'
import ModerationMessageCard from './ModerationMessageCard'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Unknown error while loading moderation reports.'
}

export default function ReviewQueueTab(props: { enabled: boolean }) {
  const reports = useModerationReports(props.enabled)
  const bannedUsers = useBannedUsers(props.enabled)
  const actions = useModerationActions()
  const anyActionPending =
    actions.hideMessage.isPending || actions.restoreMessage.isPending || actions.markReviewed.isPending || actions.banUser.isPending

  if (reports.isLoading) {
    return (
      <Stack className="ep3-mod-panel-loading" gap={10} align="center" justify="center">
        <Loader type="dots" size={20} />
        <Text className="ep3-mod-state">Loading review queue…</Text>
      </Stack>
    )
  }
  if (reports.isError) {
    return (
      <Stack gap={4} py="md">
        <Text className="ep3-mod-state">Failed to load review queue.</Text>
        <Text className="ep3-mod-state-subtle">
          {getErrorMessage(reports.error)}
        </Text>
      </Stack>
    )
  }

  const items = reports.data ?? []
  const bannedIds = new Set(
    (bannedUsers.data ?? [])
      .filter((user) => user.status.toLowerCase() === 'banned')
      .map((user) => user.supabase_user_id),
  )

  if (items.length === 0) {
    return (
      <ModerationEmptyState
        icon={Inbox}
        title="Queue clear"
        description="No reports are waiting for moderator action."
        hint="New report signals will appear here automatically."
        safeTone
      />
    )
  }

  return (
    <Stack gap="sm" py="md" className="ep3-mod-list">
      {items.map((report) => (
        (() => {
          const moderationStatus = report.moderation_status.toLowerCase()
          const manualReviewStatus = report.manual_review_status.toLowerCase()
          const isHidden = moderationStatus === 'hidden'
          const isReviewed = manualReviewStatus === 'reviewed'
          const isBanned = bannedIds.has(report.supabase_user_id)

          return (
        <ModerationMessageCard
          key={report.id}
          report={report}
          onHide={() => actions.hideMessage.mutate(report.id)}
          onRestore={() => actions.restoreMessage.mutate(report.id)}
          onReviewed={() => actions.markReviewed.mutate(report.id)}
          onBan={() => actions.banUser.mutate({ id: report.supabase_user_id })}
          hideLoading={actions.hideMessage.isPending}
          restoreLoading={actions.restoreMessage.isPending}
          reviewedLoading={actions.markReviewed.isPending}
          banLoading={actions.banUser.isPending}
          disableHideAction={anyActionPending || isHidden}
          disableRestoreAction={anyActionPending || !isHidden}
          disableReviewedAction={anyActionPending || isReviewed}
          disableBanAction={anyActionPending || bannedUsers.isError || isBanned}
        />
          )
        })()
      ))}
    </Stack>
  )
}
