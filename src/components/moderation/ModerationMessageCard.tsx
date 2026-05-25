import { useState } from 'react'
import { Button, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core'
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
  disableHideAction: boolean
  disableRestoreAction: boolean
  disableReviewedAction: boolean
  disableBanAction: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [copiedUserId, setCopiedUserId] = useState(false)
  const nickname = props.report.daily_identities?.nickname ?? 'Anonymous'
  const createdAtLabel = formatTime(props.report.created_at)
  const severityLabel = (props.report.ai_severity ?? '').toLowerCase()
  const severityTone =
    severityLabel === 'harmful' || severityLabel === 'high'
      ? 'danger'
      : severityLabel === 'moderate' || severityLabel === 'medium'
        ? 'warn'
        : 'neutral'
  const hasAiReason = typeof props.report.ai_reason === 'string' && props.report.ai_reason.trim().length > 0
  const hasPolicyReason =
    typeof props.report.policy_reason === 'string' && props.report.policy_reason.trim().length > 0
  const hasAiCategories = Array.isArray(props.report.ai_categories) && props.report.ai_categories.length > 0
  const userId = props.report.supabase_user_id
  const confidenceLabel =
    typeof props.report.ai_confidence === 'number'
      ? props.report.ai_confidence.toFixed(2)
      : 'n/a'
  const detailsId = `mod-report-details-${props.report.id}`

  const handleCopyUserId = async () => {
    if (!userId) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(userId)
      } else {
        const input = document.createElement('textarea')
        input.value = userId
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.focus()
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopiedUserId(true)
      window.setTimeout(() => setCopiedUserId(false), 1200)
    } catch {
      // no-op
    }
  }

  return (
    <Paper withBorder p="md" radius={0} className={`ep3-mod-card ep3-mod-card-${severityTone}`}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={3} className="ep3-mod-card-identity">
            <Group gap="xs" align="center" wrap="wrap">
              <Text className="ep3-mod-card-name">{nickname}</Text>
              <Text className="ep3-mod-card-time">{createdAtLabel}</Text>
            </Group>
            <Group gap={6} align="center" wrap="nowrap" className="ep3-mod-card-userid-row">
              <UnstyledButton
                className={`ep3-mod-user-id ep3-mod-user-id-copy ${copiedUserId ? 'is-copied' : ''}`}
                onClick={() => void handleCopyUserId()}
                aria-label="Copy user id"
              >
                {userId}
                {copiedUserId ? <span className="ep3-mod-user-id-copied"> copied</span> : null}
              </UnstyledButton>
            </Group>
          </Stack>
          <Group gap={6} className="ep3-mod-card-actions" wrap="wrap" justify="flex-end">
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-neutral"
              onClick={props.onReviewed}
              loading={props.reviewedLoading}
              disabled={props.disableReviewedAction}
            >
              Review
            </Button>
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-warn"
              onClick={props.onHide}
              loading={props.hideLoading}
              disabled={props.disableHideAction}
            >
              Hide
            </Button>
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-neutral"
              onClick={props.onRestore}
              loading={props.restoreLoading}
              disabled={props.disableRestoreAction}
            >
              Restore
            </Button>
            <Button
              variant="subtle"
              size="xs"
              className="ep3-mod-action ep3-mod-action-danger"
              onClick={props.onBan}
              loading={props.banLoading}
              disabled={props.disableBanAction}
            >
              Ban user
            </Button>
          </Group>
        </Group>

        <Text className="ep3-mod-card-message">{props.report.content}</Text>

        <Group gap={6} wrap="wrap" className="ep3-mod-card-summary">
          <Button
            variant="subtle"
            size="xs"
            className="ep3-mod-action ep3-mod-action-neutral ep3-mod-details-toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={detailsId}
          >
            {expanded ? 'Hide details' : 'Details'}
          </Button>
        </Group>

        {expanded ? (
          <Stack id={detailsId} gap={8} className="ep3-mod-card-details">
            <Stack gap={6} className="ep3-mod-detail-section">
              <Text className="ep3-mod-detail-heading">Moderation</Text>
              <Stack gap={4} className="ep3-mod-kv-grid">
                <Text className="ep3-mod-kv-row"><span>Status</span><strong>{props.report.moderation_status}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Reports</span><strong>{props.report.report_count}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Policy</span><strong>{props.report.policy_action ?? 'n/a'}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Manual</span><strong>{props.report.manual_review_status}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Offenses</span><strong>{props.report.offense_count_at_decision ?? 'n/a'}</strong></Text>
              </Stack>
            </Stack>

            <Stack gap={6} className="ep3-mod-detail-section">
              <Text className="ep3-mod-detail-heading">AI Assessment</Text>
              <Stack gap={4} className="ep3-mod-kv-grid">
                <Text className="ep3-mod-kv-row"><span>AI status</span><strong>{props.report.ai_moderation_status}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Verdict</span><strong>{props.report.ai_verdict ?? 'n/a'}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Severity</span><strong>{props.report.ai_severity ?? 'n/a'}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Intent</span><strong>{props.report.ai_intent ?? 'n/a'}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Targeting</span><strong>{props.report.ai_targeting ?? 'n/a'}</strong></Text>
                <Text className="ep3-mod-kv-row"><span>Confidence</span><strong>{confidenceLabel}</strong></Text>
              </Stack>
            </Stack>

            <Stack gap={6} className="ep3-mod-detail-section">
              <Text className="ep3-mod-detail-heading">Categories</Text>
              <Text className="ep3-mod-card-reason">
                {hasAiCategories ? props.report.ai_categories!.join(', ') : 'none'}
              </Text>
            </Stack>

            <Stack gap={6} className="ep3-mod-detail-section">
              <Text className="ep3-mod-detail-heading">Reasoning</Text>
              {hasAiReason ? <Text className="ep3-mod-card-reason">{props.report.ai_reason}</Text> : null}
              {!hasAiReason && hasPolicyReason ? (
                <Text className="ep3-mod-card-reason">{props.report.policy_reason}</Text>
              ) : null}
              {!hasAiReason && !hasPolicyReason ? (
                <Text className="ep3-mod-card-reason">No reasoning provided.</Text>
              ) : null}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  )
}
