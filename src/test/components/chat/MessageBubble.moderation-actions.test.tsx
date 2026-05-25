import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MantineProvider } from '@mantine/core'
import MessageBubble from '@/components/chat/MessageBubble'
import type { ChatMessage } from '@/types/chat'

const baseMessage: ChatMessage = {
  id: 'm1',
  content: 'hello',
  nickname: 'user-a',
  authorUserId: 'author-a',
  createdAt: new Date().toISOString(),
  moderationStatus: 'visible',
  deliveryStatus: 'confirmed',
}

function renderBubble(args: { isOwn: boolean; canModerate: boolean; deliveryStatus?: 'pending' | 'confirmed' }) {
  const message = {
    ...baseMessage,
    ...(args.deliveryStatus ? { deliveryStatus: args.deliveryStatus } : {}),
  }
  render(
    <MantineProvider>
      <MessageBubble
        message={message}
        isOwn={args.isOwn}
        canReport
        canReply
        canModerate={args.canModerate}
        mentionNicknames={[]}
        onReport={vi.fn()}
        onReply={vi.fn()}
        onMute={vi.fn()}
        onBan={vi.fn()}
        onJumpToReplyTarget={vi.fn()}
      />
    </MantineProvider>,
  )
}

describe('MessageBubble moderation actions', () => {
  it('shows Mute and Ban only for moderators on other users messages', () => {
    renderBubble({ isOwn: false, canModerate: true })
    expect(screen.getByRole('button', { name: /mute user-a/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ban user-a/i })).toBeInTheDocument()
  })

  it('hides Mute and Ban on own message even when moderator', () => {
    renderBubble({ isOwn: true, canModerate: true })
    expect(screen.queryByRole('button', { name: /mute user-a/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ban user-a/i })).not.toBeInTheDocument()
  })

  it('disables Mute and Ban while message is pending', () => {
    renderBubble({ isOwn: false, canModerate: true, deliveryStatus: 'pending' })
    expect(screen.getByRole('button', { name: /mute user-a/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /ban user-a/i })).toBeDisabled()
  })
})
