import { Box, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage } from '../../types/chat'
import { isSameUtcDay } from '../../utils/getTodayUTC'
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

function findMessageElement(container: HTMLElement, messageId: string): HTMLElement | null {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return container.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`)
  }

  const nodes = container.querySelectorAll<HTMLElement>('[data-message-id]')
  for (const node of nodes) {
    if (node.dataset.messageId === messageId) {
      return node
    }
  }
  return null
}

export default function MessageList(props: {
  messages: ChatMessage[]
  currentAuthorUserId: string | undefined
  currentPendingAuthorUserId: string | undefined
  canReport: boolean
  canReply: boolean
  canModerate: boolean
  mentionNicknames: string[]
  onReport: (message: ChatMessage) => void
  onReply: (message: ChatMessage) => void
  onMute: (message: ChatMessage) => void
  onBan: (message: ChatMessage) => void
  onLoadMore: () => void | Promise<unknown>
  hasMore: boolean
  loadingMore: boolean
}) {
  const {
    messages,
    currentAuthorUserId,
    currentPendingAuthorUserId,
    canReport,
    canReply,
    canModerate,
    mentionNicknames,
    onReport,
    onReply,
    onMute,
    onBan,
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
  const previousScrollHeightRef = useRef(0)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const clearHighlightTimerRef = useRef<number | null>(null)

  const messageById = useMemo(() => {
    return new Map(messages.map((message) => [message.id, message]))
  }, [messages])

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

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return

    const lastMessageId = lastMessage.id
    const lastMessageChanged = lastMessageId !== lastMessageIdRef.current
    lastMessageIdRef.current = lastMessageId

    if (!lastMessageChanged) return

    const previousScrollHeight = previousScrollHeightRef.current || el.scrollHeight
    const previousDistanceFromBottom = previousScrollHeight - (el.scrollTop + el.clientHeight)
    const wasNearBottom = previousDistanceFromBottom <= 80

    const isPendingLastMessage = lastMessage.deliveryStatus === 'pending'
    const isOwnLastMessage = isPendingLastMessage
      ? isPendingOwnMessage(lastMessage.authorUserId)
      : !!currentAuthorUserId && lastMessage.authorUserId === currentAuthorUserId

    if (isOwnLastMessage || shouldAutoFollowRef.current || wasNearBottom) {
      el.scrollTop = el.scrollHeight
      shouldAutoFollowRef.current = true
    }

    previousScrollHeightRef.current = el.scrollHeight
  }, [messages, currentAuthorUserId, isPendingOwnMessage])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || messages.length === 0) return
    if (!shouldAutoFollowRef.current) return
    el.scrollTop = el.scrollHeight
    previousScrollHeightRef.current = el.scrollHeight
  }, [messages.length])

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current)
      }
      if (clearHighlightTimerRef.current) {
        window.clearTimeout(clearHighlightTimerRef.current)
      }
    }
  }, [])

  const jumpToMessage = useCallback(
    (targetId: string | undefined) => {
      if (!targetId) return
      const container = ref.current
      if (!container) return

      const target = findMessageElement(container, targetId)
      if (!target) {
        notifications.show({
          color: 'gray',
          title: 'Reply target',
          message: 'Original message not loaded.',
        })
        return
      }

      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setHighlightedMessageId(targetId)
      if (clearHighlightTimerRef.current) {
        window.clearTimeout(clearHighlightTimerRef.current)
      }
      clearHighlightTimerRef.current = window.setTimeout(() => {
        setHighlightedMessageId((current) => (current === targetId ? null : current))
      }, 1200)
    },
    [],
  )

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

          const replyTargetMessage = m.replyToMessageId ? messageById.get(m.replyToMessageId) : undefined
          const replyPreview = m.replyPreview ?? (replyTargetMessage
            ? { nickname: replyTargetMessage.nickname, content: replyTargetMessage.content }
            : undefined)

          return (
            <Box
              key={m.id}
              data-message-id={m.id}
              {...(m.id === highlightedMessageId ? { className: 'ep3-msg-anchor-highlight' } : {})}
            >
              <MessageBubble
                message={{
                  ...m,
                  ...(replyPreview ? { replyPreview } : {}),
                }}
                isOwn={isOwn}
                canReport={canReport}
                canReply={canReply && isSameUtcDay(m.createdAt)}
                canModerate={canModerate}
                mentionNicknames={mentionNicknames}
                onReport={() => onReport(m)}
                onReply={() => onReply(m)}
                onMute={() => onMute(m)}
                onBan={() => onBan(m)}
                onJumpToReplyTarget={() => jumpToMessage(m.replyToMessageId)}
              />
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
