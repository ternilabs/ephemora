import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Center, Container, Loader, Stack, Text } from '@mantine/core'
import JoinButton from '../components/auth/JoinButton'
import UserBadge from '../components/auth/UserBadge'
import MessageInput from '../components/chat/MessageInput'
import ChatShell from '../components/layout/ChatShell'
import MessageList from '../components/chat/MessageList'
import ConnectionStatus from '../components/status/ConnectionStatus'
import PresenceCounter from '../components/status/PresenceCounter'
import ResetCountdown from '../components/status/ResetCountdown'
import { useAuth } from '../hooks/useAuth'
import { useBootstrap } from '../hooks/useBootstrap'
import { useMessageHistory } from '../hooks/useMessageHistory'
import { useMessages } from '../hooks/useMessages'
import { useSocket } from '../hooks/useSocket'
import type { ChatMessage, MessageRow } from '../types/chat'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'Ephemora' }],
  }),
  component: ChatRoute,
})

function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    content: row.content,
    nickname: row.nickname,
    createdAt: row.created_at,
    moderationStatus: row.moderation_status,
    deliveryStatus: 'confirmed',
  }
}

function dedupeById(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const m of messages) {
    byId.set(m.id, m)
  }
  return [...byId.values()]
}

function ChatRoute() {
  const bootstrap = useBootstrap()
  const { session, signInWithGoogle, signInWithGitHub, signOut } = useAuth()
  const token = session?.access_token ?? ''
  const isAuthed = token.length > 0

  const historyLimit = bootstrap.data?.limits.historyLimit ?? 50
  const history = useMessageHistory(historyLimit, bootstrap.isSuccess)
  const refetchHistory = history.refetch

  const {
    liveMessages,
    moderationOverrides,
    addPendingMessage,
    removeMessageById,
    confirmOrAddMessage,
    applyModerationUpdate,
    clearMessages,
  } = useMessages()
  const [hideHistoryMessages, setHideHistoryMessages] = useState(false)
  const resetRequestRef = useRef(0)

  const liveMessagesRef = useRef<ChatMessage[]>(liveMessages)
  useEffect(() => {
    liveMessagesRef.current = liveMessages
  }, [liveMessages])

  const removeMostRecentPending = useCallback(() => {
    const pending = [...liveMessagesRef.current].reverse().find((m) => m.deliveryStatus === 'pending')
    if (pending) {
      removeMessageById(pending.id)
    }
  }, [removeMessageById])

  const handleReset = useCallback(() => {
    clearMessages()
    setHideHistoryMessages(true)

    const requestId = ++resetRequestRef.current
    void refetchHistory().finally(() => {
      if (resetRequestRef.current === requestId) {
        setHideHistoryMessages(false)
      }
    })
  }, [clearMessages, refetchHistory])

  const socketState = useSocket({
    token,
    enabled: bootstrap.isSuccess,
    cooldownSeconds: bootstrap.data?.limits.messageCooldownSeconds ?? 5,
    onMessageNew: confirmOrAddMessage,
    onMessageModerated: applyModerationUpdate,
    onReset: handleReset,
    onRemovePending: removeMostRecentPending,
  })

  if (bootstrap.isLoading) {
    return (
      <Center h="100dvh">
        <Loader />
      </Center>
    )
  }

  if (bootstrap.isError) {
    return (
      <Center h="100dvh">
        <Container size="sm">
          <Stack gap="sm">
            <Text>Failed to load chat settings.</Text>
            <Button
              onClick={() => bootstrap.refetch()}
              variant="light"
              loading={bootstrap.isRefetching}
              disabled={bootstrap.isRefetching}
            >
              Retry
            </Button>
          </Stack>
        </Container>
      </Center>
    )
  }

  const resetAt = bootstrap.data?.reset.resetAt
  const maxLen = bootstrap.data?.limits.messageMaxLength ?? 500
  const cooldownWindowMs = (bootstrap.data?.limits.messageCooldownSeconds ?? 5) * 1000

  const rows = hideHistoryMessages ? [] : (history.data?.pages.flatMap((p) => p.messages) ?? [])
  const historyMessages = rows.map(toChatMessage)
  const messages = dedupeById([...historyMessages, ...liveMessages])
    .map((message) => ({
      ...message,
      moderationStatus: moderationOverrides[message.id] ?? message.moderationStatus,
    }))
    .filter((message) => message.moderationStatus !== 'hidden')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <ChatShell
      headerStatus={
        <>
          <ResetCountdown resetAt={resetAt} onZero={handleReset} />
          <PresenceCounter count={socketState.presenceCount} />
          <ConnectionStatus status={socketState.status} />
        </>
      }
      headerRight={
        isAuthed ? (
          <UserBadge nickname={socketState.nickname} onSignOut={signOut} />
        ) : (
          <JoinButton onGoogle={signInWithGoogle} onGitHub={signInWithGitHub} />
        )
      }
    >
      {history.isLoading ? (
        <Container size="sm" py="xl">
          <Stack gap="sm">
            <Text>Loading messages…</Text>
          </Stack>
        </Container>
      ) : history.isError ? (
        <Container size="sm" py="xl">
          <Stack gap="sm">
            <Text>Failed to load messages.</Text>
            <Button
              onClick={() => history.refetch()}
              variant="light"
              loading={history.isRefetching}
              disabled={history.isRefetching}
            >
              Retry
            </Button>
          </Stack>
        </Container>
      ) : (
        <MessageList
          messages={messages}
          onLoadMore={() => history.fetchNextPage()}
          hasMore={!!history.hasNextPage}
          loadingMore={history.isFetchingNextPage}
        />
      )}

      {isAuthed ? (
        <MessageInput
          maxLength={maxLen}
          cooldownWindowMs={cooldownWindowMs}
          cooldownRemainingMs={socketState.cooldownRemainingMs}
          muteRemainingMs={socketState.muteRemainingMs}
          onSend={(content) => {
            if (socketState.nickname) {
              addPendingMessage(content, socketState.nickname)
            }
            socketState.sendMessage(content)
          }}
        />
      ) : null}
    </ChatShell>
  )
}
