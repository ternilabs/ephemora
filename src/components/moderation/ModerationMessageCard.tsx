import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core'
import type { ModerationReport } from '../../types/moderation'
import { formatTime } from '../../utils/formatTime'

export default function ModerationMessageCard(props: {
  report: ModerationReport
  onHide: () => void
  onRestore: () => void
  onReviewed: () => void
  onBan: () => void
  hideLoading: boolean
  restoreLoading: boolean
  reviewedLoading: boolean
  banLoading: boolean
  disableActions: boolean
}) {
  const nickname = props.report.daily_identities?.nickname ?? 'Anonymous'
  const createdAtLabel = formatTime(props.report.created_at)
  const hasAiReason = typeof props.report.ai_reason === 'string' && props.report.ai_reason.trim().length > 0

  return (
    <Paper withBorder p="md" radius={0} className="ep3-mod-card">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2} className="ep3-mod-card-identity">
            <Group gap="xs" align="center" wrap="wrap">
              <Text className="ep3-mod-card-name">{nickname}</Text>
              <Text className="ep3-mod-card-time">{createdAtLabel}</Text>
            </Group>
            <Group gap={6} align="center" wrap="wrap">
              <Badge className="ep3-mod-chip ep3-mod-chip-neutral">reports: {props.report.report_count}</Badge>
              <Badge className="ep3-mod-chip ep3-mod-chip-warn">{props.report.moderation_status}</Badge>
            </Group>
          </Stack>
          <Group gap={6} className="ep3-mod-card-actions" wrap="wrap" justify="flex-end">
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-neutral"
              onClick={props.onReviewed}
              loading={props.reviewedLoading}
              disabled={props.disableActions}
            >
              Review
            </Button>
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-warn"
              onClick={props.onHide}
              loading={props.hideLoading}
              disabled={props.disableActions}
            >
              Hide
            </Button>
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-neutral"
              onClick={props.onRestore}
              loading={props.restoreLoading}
              disabled={props.disableActions}
            >
              Restore
            </Button>
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-danger"
              onClick={props.onBan}
              loading={props.banLoading}
              disabled={props.disableActions}
            >
              Ban user
            </Button>
          </Group>
        </Group>

        <Text className="ep3-mod-card-message">{props.report.content}</Text>

        <Group gap={6} wrap="wrap">
          <Badge className="ep3-mod-chip ep3-mod-chip-neutral">AI: {props.report.ai_moderation_status}</Badge>
          {props.report.ai_verdict ? (
            <Badge className="ep3-mod-chip ep3-mod-chip-neutral">verdict: {props.report.ai_verdict}</Badge>
          ) : null}
          {typeof props.report.ai_confidence === 'number' ? (
            <Badge className="ep3-mod-chip ep3-mod-chip-neutral">conf: {props.report.ai_confidence}</Badge>
          ) : null}
          {props.report.manual_review_status !== 'none' ? (
            <Badge className="ep3-mod-chip ep3-mod-chip-warn">manual: {props.report.manual_review_status}</Badge>
          ) : null}
        </Group>

        {hasAiReason ? (
          <Text className="ep3-mod-card-reason">
            {props.report.ai_reason}
          </Text>
        ) : null}
      </Stack>
    </Paper>
  )
}
