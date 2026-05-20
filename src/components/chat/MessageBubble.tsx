import { Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { CornerUpLeft, Flag } from 'lucide-react'
import clsx from 'clsx'
import { useMemo, type ReactNode } from 'react'
import type { ChatMessage } from '../../types/chat'
import { formatTime } from '../../utils/formatTime'

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildMentionPattern(mentionNicknames: string[]): RegExp | null {
  const sortedNames = [...new Set(mentionNicknames.filter(Boolean))].sort((left, right) => right.length - left.length)
  if (sortedNames.length === 0) return null
  return new RegExp(`@(${sortedNames.map(escapeRegex).join('|')})(?=$|\\s|[.,!?;:])`, 'gi')
}

function renderMessageContent(content: string, pattern: RegExp | null): ReactNode {
  if (!pattern || !content.includes('@')) return content
  const matches = [...content.matchAll(pattern)]
  if (matches.length === 0) {
    return content
  }

  const nodes: ReactNode[] = []
  let cursor = 0
  matches.forEach((match) => {
    const start = match.index ?? 0
    const raw = match[0] ?? ''
    const end = start + raw.length
    if (cursor < start) {
      nodes.push(content.slice(cursor, start))
    }
    nodes.push(
      <span key={`${start}:${raw}`} className="ep3-mention">
        {raw}
      </span>,
    )
    cursor = end
  })

  if (cursor < content.length) {
    nodes.push(content.slice(cursor))
  }

  return nodes
}

export default function MessageBubble(props: {
  message: ChatMessage
  isOwn: boolean
  canReport: boolean
  canReply: boolean
  mentionNicknames: string[]
  onReport: () => void
  onReply: () => void
  onJumpToReplyTarget: () => void
}) {
  const m = props.message
  const isPending = m.deliveryStatus === 'pending'
  const isUnderReview = m.moderationStatus === 'under_review'
  const reportLabel = `Report message from ${m.nickname} sent at ${formatTime(m.createdAt)}`
  const replyLabel = `Reply to message from ${m.nickname} sent at ${formatTime(m.createdAt)}`
  const hasReplyPreview = !!m.replyToMessageId && !!m.replyPreview
  const mentionPattern = useMemo(() => buildMentionPattern(props.mentionNicknames), [props.mentionNicknames])
  const renderedContent = useMemo(() => renderMessageContent(m.content, mentionPattern), [m.content, mentionPattern])

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
            className="ep3-msg-reply-icon"
            aria-label={replyLabel}
            disabled={!props.canReply || isPending}
            onClick={props.onReply}
          >
            <CornerUpLeft size={12} strokeWidth={1.75} />
          </UnstyledButton>
        ) : null}
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
      {hasReplyPreview ? (
        <UnstyledButton className="ep3-msg-reply-preview" onClick={props.onJumpToReplyTarget}>
          <Text className="ep3-msg-reply-author">{m.replyPreview?.nickname}</Text>
          <Text className="ep3-msg-reply-content">{m.replyPreview?.content ?? 'Original message unavailable.'}</Text>
        </UnstyledButton>
      ) : null}

      <div
        className={clsx('ep3-msg-body', {
          'ep3-msg-body-own': props.isOwn,
          'ep3-msg-body-pending': isPending,
          'ep3-msg-body-review': isUnderReview,
        })}
      >
        {renderedContent}
      </div>

      <Group gap={8} className="ep3-msg-actions" wrap="nowrap">
        {isPending ? <Text className="ep3-msg-pill">Sending…</Text> : null}
        {isUnderReview ? <Text className="ep3-msg-review-tag">● Under review</Text> : null}
      </Group>
    </Stack>
  )
}
