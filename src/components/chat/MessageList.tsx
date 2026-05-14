import { Box, Stack, Text } from '@mantine/core'
import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/chat'
import MessageBubble from './MessageBubble'

function getDayDividerLabel(messages: ChatMessage[]): string {
  const latestMessage = messages[messages.length - 1]
  if (!latestMessage) {
    return 'Today · UTC'
  }

  const createdAt = new Date(latestMessage.createdAt)
  if (Number.isNaN(createdAt.getTime())) {
    return 'UTC'
  }

  const now = new Date()
  const isTodayUtc =
    createdAt.getUTCFullYear() === now.getUTCFullYear() &&
    createdAt.getUTCMonth() === now.getUTCMonth() &&
    createdAt.getUTCDate() === now.getUTCDate()

  if (isTodayUtc) {
    return 'Today · UTC'
  }

  return `${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(createdAt)} · UTC`
}

export default function MessageList(props: {
  messages: ChatMessage[]
  currentNickname?: string | null
  canReport: boolean
  onReport: (message: ChatMessage) => void
  onLoadMore: () => void | Promise<unknown>
  hasMore: boolean
  loadingMore: boolean
}) {
  const { messages, currentNickname, canReport, onReport, onLoadMore, hasMore, loadingMore } = props
  const dayDividerLabel = getDayDividerLabel(messages)
  const ref = useRef<HTMLDivElement | null>(null)
  const loadLockedRef = useRef(false)
  const loadingMoreRef = useRef(loadingMore)
  const unlockTimerRef = useRef<number | null>(null)

  useEffect(() => {
    loadingMoreRef.current = loadingMore
    if (!loadingMore) {
      loadLockedRef.current = false
    }
  }, [loadingMore])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const maybeLoadMore = () => {
      if (!hasMore || loadingMore || loadLockedRef.current) return

      const nearTop = el.scrollTop <= 80
      const noOverflow = el.scrollHeight <= el.clientHeight
      if (!nearTop && !noOverflow) return

      loadLockedRef.current = true
      const result = onLoadMore()

      if (result && typeof result.finally === 'function') {
        result.finally(() => {
          if (!loadingMoreRef.current) {
            loadLockedRef.current = false
          }
        })
        return
      }

      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current)
      }

      unlockTimerRef.current = window.setTimeout(() => {
        if (!loadingMoreRef.current) {
          loadLockedRef.current = false
        }
        unlockTimerRef.current = null
      }, 300)
    }

    const onScroll = () => maybeLoadMore()
    el.addEventListener('scroll', onScroll)
    maybeLoadMore()

    return () => {
      el.removeEventListener('scroll', onScroll)
    }
  }, [hasMore, loadingMore, messages.length, onLoadMore])

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current)
      }
    }
  }, [])

  return (
    <Box ref={ref} className="ep3-feed">
      <Box className="ep3-day-divider">
        <Box className="ep3-day-divider-line" />
        <Text className="ep3-day-divider-text">{dayDividerLabel}</Text>
        <Box className="ep3-day-divider-line" />
      </Box>

      <Stack gap={14}>
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={currentNickname !== null && currentNickname !== undefined && m.nickname === currentNickname}
            canReport={canReport}
            onReport={() => onReport(m)}
          />
        ))}
      </Stack>
    </Box>
  )
}
