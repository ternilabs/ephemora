import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Anchor, Box, Button, Center, Container, Loader, Stack, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import JoinButton from '../components/auth/JoinButton'
import MessageInput from '../components/chat/MessageInput'
import MessageList from '../components/chat/MessageList'
import LeftSidebar from '../components/layout/LeftSidebar'
import ReportMessageModal from '../components/modals/ReportMessageModal'
import { useAuth } from '../hooks/useAuth'
import { useBootstrap } from '../hooks/useBootstrap'
import { useCountdown } from '../hooks/useCountdown'
import { useMessageHistory } from '../hooks/useMessageHistory'
import { useMessages } from '../hooks/useMessages'
import { useModeratorAccessCache } from '../hooks/useModerator'
import { useReportMessage } from '../hooks/useReportMessage'
import { useSocket, type SocketStatus } from '../hooks/useSocket'
import type { ChatMessage, MessageRow } from '../types/chat'
import { formatTime } from '../utils/formatTime'

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

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function getConnectionBadgeState(status: SocketStatus): Exclude<SocketStatus, 'disconnected'> | 'offline' {
  return status === 'disconnected' ? 'offline' : status
}

function getConnectionLabel(status: SocketStatus): string {
  if (status === 'connected') return 'Connected'
  if (status === 'connecting') return 'Connecting'
  if (status === 'waking') return 'Waking up…'
  if (status === 'unavailable') return 'Unavailable'
  return 'Offline'
}

function ChatRoute() {
  const navigate = useNavigate({ from: '/' })
  const queryClient = useQueryClient()
  const bootstrap = useBootstrap()
  const { session, signInWithGoogle, signInWithGitHub, signOut } = useAuth()
  const moderatorAccess = useModeratorAccessCache()
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
    void queryClient.removeQueries({ queryKey: ['messages', 'history', historyLimit], exact: true })

    const requestId = ++resetRequestRef.current
    void refetchHistory().finally(() => {
      if (resetRequestRef.current === requestId) {
        setHideHistoryMessages(false)
      }
    })
  }, [clearMessages, historyLimit, queryClient, refetchHistory])

  const socketState = useSocket({
    token,
    enabled: bootstrap.isSuccess,
    cooldownSeconds: bootstrap.data?.limits.messageCooldownSeconds ?? 5,
    onMessageNew: confirmOrAddMessage,
    onMessageModerated: applyModerationUpdate,
    onReset: handleReset,
    onRemovePending: removeMostRecentPending,
  })
  const report = useReportMessage(socketState.socket)
  const connectionState = getConnectionBadgeState(socketState.status)
  const connectionLabel = getConnectionLabel(socketState.status)
  const resetAt = bootstrap.data?.reset.resetAt
  const maxLen = bootstrap.data?.limits.messageMaxLength ?? 500
  const cooldownWindowMs = (bootstrap.data?.limits.messageCooldownSeconds ?? 5) * 1000
  const { secondsRemaining } = useCountdown({ resetAt, onZero: handleReset })

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

  const rows = hideHistoryMessages ? [] : (history.data?.pages.flatMap((p) => p.messages) ?? [])
  const historyMessages = rows.map(toChatMessage)
  const messages = dedupeById([...historyMessages, ...liveMessages])
    .map((message) => ({
      ...message,
      moderationStatus: moderationOverrides[message.id] ?? message.moderationStatus,
    }))
    .filter((message) => message.moderationStatus !== 'hidden')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const reportedMessages = [...messages]
    .reverse()
    .filter((message) => message.moderationStatus === 'under_review')
    .slice(0, 12)

  const openReport = (m: ChatMessage) => {
    const id = modals.open({
      title: 'Report message',
      closeOnClickOutside: false,
      closeOnEscape: false,
      children: (
        <ReportMessageModal
          contentPreview={m.content}
          onCancel={() => modals.close(id)}
          onSubmit={async (reason) => {
            const ack = await report.mutateAsync({
              messageId: m.id,
              ...(reason !== undefined ? { reason } : {}),
            })

            if (ack.ok || ack.error === 'already_reported') {
              modals.close(id)
            }
          }}
        />
      ),
    })
  }

  return (
    <Box className="ep3-root">
      <LeftSidebar presenceCount={socketState.presenceCount} />

      <Box className="ep3-middle">
        <Box className="ep3-mid-header">
          <Text className="ep3-room-title">Global</Text>
          <Text className={`ep3-connected-badge ep3-connected-${connectionState}`}>
            {connectionLabel}
          </Text>
        </Box>

        {history.isLoading ? (
          <Container className="ep3-chat-state" size="sm" py="xl">
            <Stack gap="sm">
              <Text>Loading messages…</Text>
            </Stack>
          </Container>
        ) : history.isError ? (
          <Container className="ep3-chat-state" size="sm" py="xl">
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
            currentNickname={socketState.nickname}
            canReport={isAuthed && socketState.status === 'connected'}
            onReport={openReport}
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
            nickname={socketState.nickname}
            sendDisabled={socketState.status !== 'connected'}
            showModeratorAction={moderatorAccess.isModerator && !moderatorAccess.isChecking}
            onModerator={() => navigate({ to: '/moderation' })}
            onSignOut={signOut}
            onSend={(content) => {
              if (socketState.nickname) {
                addPendingMessage(content, socketState.nickname)
              }
              socketState.sendMessage(content)
            }}
          />
        ) : (
          <Box className="ep3-login-area">
            <Text className="ep3-login-title">Join the room to post</Text>
            <Text className="ep3-login-subtitle">
              You can read publicly, but posting requires a quick OAuth sign-in.
            </Text>
            <JoinButton onGoogle={signInWithGoogle} onGitHub={signInWithGitHub} />
          </Box>
        )}

        <Box className="ep3-mobile-legal-links">
          <Anchor className="ep3-left-footer-link" component={Link} to="/about">
            About
          </Anchor>
          <Anchor className="ep3-left-footer-link" component={Link} to="/privacy">
            Privacy
          </Anchor>
          <Anchor className="ep3-left-footer-link" component={Link} to="/terms">
            Terms
          </Anchor>
        </Box>
      </Box>

      <Box className="ep3-right">
        <Box className="ep3-right-body">
          <Box className="ep3-info-section ep3-reset-section">
            <Text className="ep3-info-label">Next Reset</Text>
            <Box className="ep3-reset-block">
              <Text className="ep3-reset-time">{formatSeconds(secondsRemaining)}</Text>
              <Text className="ep3-reset-sub">Next global wipe at 00:00 UTC</Text>
            </Box>
          </Box>

          <Box className="ep3-reports-section">
            <Box className="ep3-info-label-row">
              <Text className="ep3-info-label">Room Under Review</Text>
              <Text className="ep3-count-pill">{reportedMessages.length} active</Text>
            </Box>

            <Box className="ep3-reports-scroll">
              {reportedMessages.length === 0 ? (
                <Text className="ep3-reported-empty">No active room-level review signals.</Text>
              ) : (
                reportedMessages.map((message) => (
                  <Box key={message.id} className="ep3-reported-item">
                    <Box className="ep3-reported-top">
                      <Text className="ep3-reported-nick">{message.nickname}</Text>
                      <Text className="ep3-reported-time">{formatTime(message.createdAt)}</Text>
                    </Box>
                    <Text className="ep3-reported-preview">
                      {message.moderationStatus === 'under_review'
                        ? 'This message has been flagged for review.'
                        : message.content}
                    </Text>
                    <Box className="ep3-reported-meta">
                      <Text className="ep3-reported-badge">Under review</Text>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
