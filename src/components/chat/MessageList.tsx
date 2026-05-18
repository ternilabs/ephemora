import { Box, Stack, Text } from '@mantine/core'
import { useCallback, useEffect, useRef } from 'react'
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
  currentAuthorUserId: string | undefined
  currentPendingAuthorUserId: string | undefined
  canReport: boolean
  onReport: (message: ChatMessage) => void
  onLoadMore: () => void | Promise<unknown>
  hasMore: boolean
  loadingMore: boolean
}) {
  const {
    messages,
    currentAuthorUserId,
    currentPendingAuthorUserId,
    canReport,
    onReport,
    onLoadMore,
    hasMore,
    loadingMore,
  } = props
  const dayDividerLabel = getDayDividerLabel(messages)
  const ref = useRef<HTMLDivElement | null>(null)
  const loadLockedRef = useRef(false)
  const loadingMoreRef = useRef(loadingMore)
  const unlockTimerRef = useRef<number | null>(null)
  const noOverflowLoadForCountRef = useRef<number | null>(null)
  const shouldAutoFollowRef = useRef(true)
  const lastMessageIdRef = useRef<string | null>(null)

  const isPendingOwnMessage = useCallback(
    (authorId: string) => {
      if (currentPendingAuthorUserId && authorId === currentPendingAuthorUserId) return true
      if (currentAuthorUserId && authorId === currentAuthorUserId) return true
      return false
    },
    [currentPendingAuthorUserId, currentAuthorUserId],
  )

  useEffect(() => {
    loadingMoreRef.current = loadingMore
    if (!loadingMore) {
      loadLockedRef.current = false
    }
  }, [loadingMore])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const syncFollowState = () => {
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
      shouldAutoFollowRef.current = distanceFromBottom <= 80
    }

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

    const onScroll = () => {
      syncFollowState()
      maybeLoadMore()
    }
    el.addEventListener('scroll', onScroll)
    syncFollowState()

    return () => {
      el.removeEventListener('scroll', onScroll)
    }
  }, [hasMore, loadingMore, onLoadMore])

  useEffect(() => {
    const el = ref.current
    if (!el || !hasMore || loadingMore || loadLockedRef.current) return
    if (noOverflowLoadForCountRef.current === messages.length) return

    const noOverflow = el.scrollHeight <= el.clientHeight
    if (!noOverflow) return

    noOverflowLoadForCountRef.current = messages.length
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
  }, [messages.length, hasMore, loadingMore, onLoadMore])

  useEffect(() => {
    const el = ref.current
    if (!el || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return

    const lastMessageId = lastMessage.id
    const lastMessageChanged = lastMessageId !== lastMessageIdRef.current
    lastMessageIdRef.current = lastMessageId

    if (!lastMessageChanged) return

    const isPendingLastMessage = lastMessage.deliveryStatus === 'pending'
    const isOwnLastMessage = isPendingLastMessage
      ? isPendingOwnMessage(lastMessage.authorUserId)
      : !!currentAuthorUserId && lastMessage.authorUserId === currentAuthorUserId

    if (isOwnLastMessage || shouldAutoFollowRef.current) {
      el.scrollTop = el.scrollHeight
      shouldAutoFollowRef.current = true
    }
  }, [messages, currentAuthorUserId, isPendingOwnMessage])

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
        {messages.map((m) => {
          const isPendingMessage = m.deliveryStatus === 'pending'
          const isOwn = isPendingMessage
            ? isPendingOwnMessage(m.authorUserId)
            : !!currentAuthorUserId && m.authorUserId === currentAuthorUserId

          return (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={isOwn}
            canReport={canReport}
            onReport={() => onReport(m)}
          />
          )
        })}
      </Stack>
    </Box>
  )
}
