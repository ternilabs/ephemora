import { Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { Flag } from 'lucide-react'
import clsx from 'clsx'
import type { ChatMessage } from '../../types/chat'
import { formatTime } from '../../utils/formatTime'

export default function MessageBubble(props: {
  message: ChatMessage
  isOwn: boolean
  canReport: boolean
  onReport: () => void
}) {
  const m = props.message
  const isPending = m.deliveryStatus === 'pending'
  const isUnderReview = m.moderationStatus === 'under_review'
  const reportLabel = `Report message from ${m.nickname} sent at ${formatTime(m.createdAt)}`

  return (
    <Stack
      gap={4}
      className={clsx('ep3-msg', {
        'ep3-msg-own': props.isOwn,
        'ep3-msg-other': !props.isOwn,
        'ep3-msg-review': isUnderReview,
      })}
    >
      <Group gap={6} className={clsx('ep3-msg-top', { 'ep3-msg-top-own': props.isOwn })} wrap="nowrap">
        <Text className={clsx('ep3-msg-author', { 'ep3-msg-author-own': props.isOwn })}>{m.nickname}</Text>
        <Text className="ep3-msg-time">{formatTime(m.createdAt)}</Text>
        {!props.isOwn ? (
          <UnstyledButton
            className="ep3-msg-report-icon"
            aria-label={reportLabel}
            disabled={!props.canReport || isPending}
            onClick={props.onReport}
          >
            <Flag size={12} strokeWidth={1.75} />
          </UnstyledButton>
        ) : null}
      </Group>

      <div
        className={clsx('ep3-msg-body', {
          'ep3-msg-body-own': props.isOwn,
          'ep3-msg-body-pending': isPending,
          'ep3-msg-body-review': isUnderReview,
        })}
      >
        {m.content}
      </div>

      <Group gap={8} className="ep3-msg-actions" wrap="nowrap">
        {isPending ? <Text className="ep3-msg-pill">Sending…</Text> : null}
        {isUnderReview ? <Text className="ep3-msg-review-tag">● Under review</Text> : null}
      </Group>
    </Stack>
  )
}
