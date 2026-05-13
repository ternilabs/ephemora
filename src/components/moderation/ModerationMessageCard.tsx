import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core'
import type { ModerationReport } from '../../types/moderation'

export default function ModerationMessageCard(props: {
  report: ModerationReport
  onHide: () => void
  onRestore: () => void
  onReviewed: () => void
}) {
  const nickname = props.report.daily_identities?.nickname ?? 'Anonymous'

  return (
    <Paper withBorder p="sm" radius={0}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={600}>{nickname}</Text>
            <Badge color="gray">reports: {props.report.report_count}</Badge>
            <Badge color="yellow">{props.report.moderation_status}</Badge>
          </Group>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={props.onReviewed}>
              Mark reviewed
            </Button>
            <Button color="yellow" size="xs" onClick={props.onHide}>
              Hide
            </Button>
            <Button variant="default" size="xs" onClick={props.onRestore}>
              Restore
            </Button>
          </Group>
        </Group>

        <Text size="sm">{props.report.content}</Text>

        <Group gap="xs">
          <Badge color="gray">AI: {props.report.ai_moderation_status}</Badge>
          {props.report.ai_verdict ? <Badge color="gray">verdict: {props.report.ai_verdict}</Badge> : null}
          {typeof props.report.ai_confidence === 'number' ? (
            <Badge color="gray">conf: {props.report.ai_confidence}</Badge>
          ) : null}
          {props.report.manual_review_status !== 'none' ? (
            <Badge color="yellow">manual: {props.report.manual_review_status}</Badge>
          ) : null}
        </Group>

        {props.report.ai_reason ? (
          <Text size="xs" c="dimmed">
            {props.report.ai_reason}
          </Text>
        ) : null}
      </Stack>
    </Paper>
  )
}
