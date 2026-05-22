import { Group, Loader, Stack, Text } from '@mantine/core'
import { useModerationAiActions } from '../../hooks/useModerationAiActions'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Unknown error while loading AI actions.'
}

function formatRelativeTime(input: string): string {
  const value = new Date(input)
  if (Number.isNaN(value.getTime())) return 'Unknown time'

  const diffMs = Date.now() - value.getTime()
  const absMinutes = Math.floor(Math.abs(diffMs) / 60_000)
  if (absMinutes < 1) return diffMs < 0 ? 'in moments' : 'just now'
  const diffMinutes = absMinutes
  const isFuture = diffMs < 0

  if (diffMinutes < 60) return isFuture ? `in ${diffMinutes}m` : `${diffMinutes}m ago`
  if (diffMinutes < 1_440) {
    const hours = Math.floor(diffMinutes / 60)
    return isFuture ? `in ${hours}h` : `${hours}h ago`
  }
  const days = Math.floor(diffMinutes / 1_440)
  return isFuture ? `in ${days}d` : `${days}d ago`
}

function formatAbsoluteTime(input: string): string {
  const value = new Date(input)
  if (Number.isNaN(value.getTime())) return input
  return value.toLocaleString()
}

function summarizeAction(action: string): string {
  const normalized = action.trim().toLowerCase()
  const labels: Record<string, string> = {
    ban_user: 'Ban user',
    unban_user: 'Unban user',
    hide_message: 'Hide message',
    restore_message: 'Restore message',
    mark_reviewed: 'Mark reviewed',
  }

  if (labels[normalized]) return labels[normalized]
  return action.replace(/_/g, ' ')
}

export default function AiActionsTab(props: { enabled: boolean }) {
  const actions = useModerationAiActions(props.enabled)

  if (actions.isLoading) {
    return (
      <Stack className="ep3-mod-panel-loading" gap={10} align="center" justify="center">
        <Loader type="dots" size={20} />
        <Text className="ep3-mod-state">Loading AI actions…</Text>
      </Stack>
    )
  }
  if (actions.isError) {
    return (
      <Stack gap={4} py="md">
        <Text className="ep3-mod-state">Failed to load AI actions.</Text>
        <Text className="ep3-mod-state-subtle">{getErrorMessage(actions.error)}</Text>
      </Stack>
    )
  }
  const items = actions.data ?? []
  if (items.length === 0) {
    return <Text className="ep3-mod-state" py="md">No AI actions yet.</Text>
  }

  const parseActionTime = (timestamp: string): number | null => {
    const value = new Date(timestamp).getTime()
    return Number.isFinite(value) ? value : null
  }
  const itemsWithParsedTime = items.map((action) => ({
    action,
    parsedTime: parseActionTime(action.created_at),
  }))

  const itemsByNewest = [...itemsWithParsedTime].sort((left, right) => {
    const rightTime = right.parsedTime
    const leftTime = left.parsedTime

    if (rightTime === null && leftTime === null) return 0
    if (rightTime === null) return 1
    if (leftTime === null) return -1
    return rightTime - leftTime
  })

  const latestWithValidTime = itemsByNewest.find((item) => item.parsedTime !== null)

  return (
    <Stack gap="sm" py="md" className="ep3-mod-log-root">
      <Group className="ep3-mod-log-summary" justify="space-between">
        <Text className="ep3-mod-log-summary-item">{items.length} actions</Text>
        <Text
          className="ep3-mod-log-summary-item"
          title={latestWithValidTime ? formatAbsoluteTime(latestWithValidTime.action.created_at) : 'Unknown time'}
        >
          Latest: {latestWithValidTime ? formatRelativeTime(latestWithValidTime.action.created_at) : 'Unknown'}
        </Text>
      </Group>

      <Stack gap={8} className="ep3-mod-log-list">
        {itemsByNewest.map(({ action }) => (
          <Stack key={action.id} gap={8} className="ep3-mod-log-item">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Group gap={6}>
                <Text className="ep3-mod-chip ep3-mod-chip-neutral">{summarizeAction(action.action)}</Text>
                <Text className="ep3-mod-chip ep3-mod-chip-neutral">{action.target_type}</Text>
              </Group>
              <Text className="ep3-mod-card-time" title={formatAbsoluteTime(action.created_at)}>
                {formatRelativeTime(action.created_at)}
              </Text>
            </Group>

            <Group justify="space-between" wrap="nowrap" align="center" gap={8}>
              <Text className="ep3-mod-user-id ep3-mod-log-id" title={action.target_id}>
                {action.target_id}
              </Text>
              <Text className="ep3-mod-state-subtle">{action.source}</Text>
            </Group>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}
