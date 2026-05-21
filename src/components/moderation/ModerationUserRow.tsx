import { Button, Group, Paper, Stack, Text } from '@mantine/core'
import type { BannedUser } from '../../types/moderation'
import { formatTime } from '../../utils/formatTime'

export default function ModerationUserRow(props: {
  user: BannedUser
  onUnban: () => void
  unbanLoading: boolean
  unbanDisabled: boolean
}) {
  const bannedUntil = props.user.banned_until ? formatTime(props.user.banned_until) : '—'
  return (
    <Paper withBorder p="md" radius={0} className="ep3-mod-card">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2}>
          <Text className="ep3-mod-card-name ep3-mod-user-id">{props.user.supabase_user_id}</Text>
          <Text className="ep3-mod-state-subtle">
            until: {bannedUntil} • reason: {props.user.ban_reason ?? '—'}
          </Text>
        </Stack>
        <Button
          variant="subtle"
          size="xs"
          className="ep3-mod-action ep3-mod-action-neutral"
          onClick={props.onUnban}
          loading={props.unbanLoading}
          disabled={props.unbanDisabled}
        >
          Unban
        </Button>
      </Group>
    </Paper>
  )
}
