import { Stack, Text } from '@mantine/core'
import { useModerationActions } from '../../hooks/useModerationActions'
import { useModerationReports } from '../../hooks/useModerationReports'
import ModerationMessageCard from './ModerationMessageCard'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Unknown error while loading moderation reports.'
}

export default function ReviewQueueTab(props: { enabled: boolean }) {
  const reports = useModerationReports(props.enabled)
  const actions = useModerationActions()
  const disableActions =
    actions.hideMessage.isPending ||
    actions.restoreMessage.isPending ||
    actions.markReviewed.isPending ||
    actions.banUser.isPending

  if (reports.isLoading) return <Text className="ep3-mod-state">Loading review queue…</Text>
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

  if (items.length === 0) {
    return (
      <Stack gap={4} py="md">
        <Text className="ep3-mod-state">No reports in queue.</Text>
        <Text className="ep3-mod-state-subtle">New report signals will appear here.</Text>
      </Stack>
    )
  }

  return (
    <Stack gap="sm" py="md" className="ep3-mod-list">
      {items.map((report) => (
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
          disableActions={disableActions}
        />
      ))}
    </Stack>
  )
}
