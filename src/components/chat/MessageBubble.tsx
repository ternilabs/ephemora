import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core'
import type { ChatMessage } from '../../types/chat'
import { formatTime } from '../../utils/formatTime'

export default function MessageBubble(props: {
  message: ChatMessage
  canReport: boolean
  onReport: () => void
}) {
  const m = props.message
  const isPending = m.deliveryStatus === 'pending'

  return (
    <Paper withBorder p="sm" radius={0}>
      <Stack gap={6}>
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm" fw={600}>
              {m.nickname}
            </Text>
            <Text size="xs" c="dimmed">
              {formatTime(m.createdAt)}
            </Text>
          </Group>
          <Group gap="xs">
            {isPending ? <Badge color="gray">Sending…</Badge> : null}
            {m.moderationStatus === 'under_review' ? <Badge color="yellow">Under review</Badge> : null}
            <Button
              variant="default"
              size="xs"
              disabled={!props.canReport || isPending}
              onClick={props.onReport}
            >
              Report
            </Button>
          </Group>
        </Group>

        <Text size="sm">{m.content}</Text>
      </Stack>
    </Paper>
  )
}
