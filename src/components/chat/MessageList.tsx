import { Box, Stack } from '@mantine/core'
import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/chat'
import MessageBubble from './MessageBubble'

export default function MessageList(props: {
  messages: ChatMessage[]
  onLoadMore: () => void
  hasMore: boolean
  loadingMore: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onScroll = () => {
      if (!props.hasMore || props.loadingMore) return
      if (el.scrollTop <= 80) props.onLoadMore()
    }

    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [props.hasMore, props.loadingMore, props.onLoadMore])

  return (
    <Box
      ref={ref}
      style={{
        height: 'calc(100dvh - 56px - 44px)',
        overflowY: 'auto',
      }}
      px="md"
      py="md"
    >
      <Stack gap="sm">
        {props.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </Stack>
    </Box>
  )
}
