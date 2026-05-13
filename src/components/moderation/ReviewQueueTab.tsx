import { Stack, Text } from '@mantine/core'
import { useModerationActions } from '../../hooks/useModerationActions'
import { useModerationReports } from '../../hooks/useModerationReports'
import ModerationMessageCard from './ModerationMessageCard'

export default function ReviewQueueTab(props: { enabled: boolean }) {
  const reports = useModerationReports(props.enabled)
  const actions = useModerationActions()
  const disableActions =
    actions.hideMessage.isPending ||
    actions.restoreMessage.isPending ||
    actions.markReviewed.isPending ||
    actions.banUser.isPending

  if (reports.isLoading) return <Text>Loading…</Text>
  if (reports.isError) return <Text>Failed to load.</Text>

  const items = reports.data ?? []

  return (
    <Stack gap="sm" py="md">
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
