import { Badge, Group, Paper, Stack, Text } from '@mantine/core'
import type { ChatMessage } from '../../types/chat'
import { formatTime } from '../../utils/formatTime'

export default function MessageBubble(props: { message: ChatMessage }) {
  const m = props.message

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
          {m.moderationStatus === 'under_review' ? (
            <Badge color="yellow">Under review</Badge>
          ) : null}
        </Group>

        <Text size="sm">{m.content}</Text>
      </Stack>
    </Paper>
  )
}
