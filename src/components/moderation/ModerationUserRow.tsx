import { Button, Group, Paper, Stack, Text } from '@mantine/core'
import type { BannedUser } from '../../types/moderation'

export default function ModerationUserRow(props: { user: BannedUser; onUnban: () => void }) {
  return (
    <Paper withBorder p="sm" radius={0}>
      <Group justify="space-between">
        <Stack gap={2}>
          <Text fw={600}>{props.user.supabase_user_id}</Text>
          <Text size="xs" c="dimmed">
            until: {props.user.banned_until ?? '—'} • reason: {props.user.ban_reason ?? '—'}
          </Text>
        </Stack>
        <Button variant="default" onClick={props.onUnban}>
          Unban
        </Button>
      </Group>
    </Paper>
  )
}
