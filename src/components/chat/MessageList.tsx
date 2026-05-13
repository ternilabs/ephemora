import { Box, Stack } from '@mantine/core'
import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/chat'
import MessageBubble from './MessageBubble'

export default function MessageList(props: {
  messages: ChatMessage[]
  canReport: boolean
  bottomInsetPx: number
  onReport: (message: ChatMessage) => void
  onLoadMore: () => void | Promise<unknown>
  hasMore: boolean
  loadingMore: boolean
}) {
  const { messages, canReport, bottomInsetPx, onReport, onLoadMore, hasMore, loadingMore } = props
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
    <Box
      ref={ref}
      style={{
        height: `calc(100dvh - 56px - 44px - ${bottomInsetPx}px)`,
        overflowY: 'auto',
      }}
      px="md"
      py="md"
    >
      <Stack gap="sm">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            canReport={canReport}
            onReport={() => onReport(m)}
          />
        ))}
      </Stack>
    </Box>
  )
}
