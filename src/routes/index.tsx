import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { ActionIcon, Box, Center, Container, Drawer, Loader, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { PanelLeftOpen, PanelRightOpen, RefreshCw, ServerOff } from 'lucide-react'
import JoinButton from '../components/auth/JoinButton'
import MessageInput from '../components/chat/MessageInput'
import MessageList from '../components/chat/MessageList'
import LeftSidebar from '../components/layout/LeftSidebar'
import RightPanelContent from '../components/layout/RightPanelContent'
import BanUserModal from '../components/modals/BanUserModal'
import MuteUserModal from '../components/modals/MuteUserModal'
import ReportMessageModal from '../components/modals/ReportMessageModal'
import { useAuth } from '../hooks/useAuth'
import { useBootstrap } from '../hooks/useBootstrap'
import { useCountdown } from '../hooks/useCountdown'
import { useMessageHistory } from '../hooks/useMessageHistory'
import { useMessages } from '../hooks/useMessages'
import { useModerationActions } from '../hooks/useModerationActions'
import { useModeratorAccessCache } from '../hooks/useModerator'
import { usePresenceRoster } from '../hooks/usePresenceRoster'
import { useReportMessage } from '../hooks/useReportMessage'
import { useSocket, type SocketStatus } from '../hooks/useSocket'
import { ModerationApiError } from '../lib/moderationApi'
import type { ChatMessage, MessageRow, PresenceRosterUser, ReplyPreview } from '../types/chat'
import type { ModerationActionErrorCode } from '../types/moderation'
import { isSameUtcDay } from '../utils/getTodayUTC'

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
    authorUserId: row.authorUserId,
    createdAt: row.created_at,
    moderationStatus: row.moderation_status,
    deliveryStatus: 'confirmed',
    ...(row.replyToMessageId ? { replyToMessageId: row.replyToMessageId } : {}),
    ...(row.replyPreview ? { replyPreview: row.replyPreview } : {}),
  }
}

function moderationRank(status: ChatMessage['moderationStatus']): number {
  if (status === 'hidden') return 3
  if (status === 'under_review') return 2
  return 1
}

function mergeMessage(existing: ChatMessage, incoming: ChatMessage): ChatMessage {
  const existingRank = moderationRank(existing.moderationStatus)
  const incomingRank = moderationRank(incoming.moderationStatus)
  const moderationStatus = incomingRank >= existingRank ? incoming.moderationStatus : existing.moderationStatus

  if (existing.deliveryStatus === 'pending' && incoming.deliveryStatus === 'confirmed') {
    return { ...incoming, moderationStatus }
  }

  if (existing.deliveryStatus === 'confirmed' && incoming.deliveryStatus === 'pending') {
    return { ...existing, moderationStatus }
  }

  return { ...incoming, moderationStatus }
}

function dedupeById(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const m of messages) {
    const existing = byId.get(m.id)
    byId.set(m.id, existing ? mergeMessage(existing, m) : m)
  }
  return [...byId.values()]
}

function getConnectionBadgeState(status: SocketStatus): Exclude<SocketStatus, 'disconnected'> | 'offline' {
  return status === 'disconnected' ? 'offline' : status
}

function getConnectionLabel(status: SocketStatus, blockedKind: 'muted' | 'banned' | null): string {
  if (status === 'connected') return 'Connected'
  if (status === 'blocked') {
    if (blockedKind === 'banned') return 'Banned'
    if (blockedKind === 'muted') return 'Muted'
    return 'Blocked'
  }
  if (status === 'connecting') return 'Connecting'
  if (status === 'waking') return 'Waking up…'
  if (status === 'unavailable') return 'Unavailable'
  return 'Offline'
}

export function getModerationActionErrorMessage(code?: ModerationActionErrorCode): string {
  if (code === 'validation_failed') return 'Invalid mute duration or reset window has expired.'
  if (code === 'not_found') return 'User is no longer available.'
  if (code === 'forbidden') return 'Moderator access is required for this action.'
  return 'Server error while applying moderation action.'
}

export function shouldScheduleResetFallback(isResetting: boolean, resetRequestStarted: boolean): boolean {
  return isResetting && !resetRequestStarted
}

function ChatRoute() {
  const navigate = useNavigate({ from: '/' })
  const queryClient = useQueryClient()
  const bootstrap = useBootstrap()
  const { session, isLoading: authLoading, signInWithDiscord, signInWithGitHub, signOut } = useAuth()
  const moderatorAccess = useModeratorAccessCache()
  const moderationActions = useModerationActions()
  const token = session?.access_token ?? ''
  const userId = session?.user.id
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
  const [isResetting, setIsResetting] = useState(false)
  const resetRequestRef = useRef(0)
  const resetRequestStartedRef = useRef(false)
  const [replyTarget, setReplyTarget] = useState<{ id: string; preview: ReplyPreview } | null>(null)

  const liveMessagesRef = useRef<ChatMessage[]>(liveMessages)
  useEffect(() => {
    liveMessagesRef.current = liveMessages
  }, [liveMessages])

  const removeMostRecentPending = useCallback((pendingId?: string) => {
    const pending =
      pendingId !== undefined
        ? liveMessagesRef.current.find((message) => message.id === pendingId)
        : [...liveMessagesRef.current].reverse().find((message) => message.deliveryStatus === 'pending')
    if (pending) {
      removeMessageById(pending.id)
    }
  }, [removeMessageById])

  const beginResetLock = useCallback(() => {
    resetRequestStartedRef.current = false
    setIsResetting(true)
    setReplyTarget(null)
    setHideHistoryMessages(true)
  }, [])

  const handleReset = useCallback(() => {
    beginResetLock()
    resetRequestStartedRef.current = true
    clearMessages()
    void queryClient.removeQueries({ queryKey: ['messages', 'history', historyLimit], exact: true })
    void bootstrap.refetch()

    const requestId = ++resetRequestRef.current
    void refetchHistory().finally(() => {
      if (resetRequestRef.current === requestId) {
        resetRequestStartedRef.current = false
        setHideHistoryMessages(false)
        setIsResetting(false)
      }
    })
  }, [beginResetLock, bootstrap, clearMessages, historyLimit, queryClient, refetchHistory])

  useEffect(() => {
    if (!shouldScheduleResetFallback(isResetting, resetRequestStartedRef.current)) return

    const timer = window.setTimeout(() => {
      if (!isResetting || resetRequestStartedRef.current) return
      handleReset()
    }, 8_000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isResetting, handleReset])

  const socketState = useSocket({
    token,
    ...(userId ? { userId } : {}),
    enabled: bootstrap.isSuccess,
    cooldownSeconds: bootstrap.data?.limits.messageCooldownSeconds ?? 5,
    onMessageNew: confirmOrAddMessage,
    onMessageModerated: applyModerationUpdate,
    onReset: handleReset,
    onRemovePending: removeMostRecentPending,
  })
  const presenceRoster = usePresenceRoster(socketState.socket)
  const report = useReportMessage(socketState.socket)
  const connectionState = getConnectionBadgeState(socketState.status)
  const connectionLabel = getConnectionLabel(socketState.status, socketState.blockedKind)
  const resetAt = bootstrap.data?.reset.resetAt
  const maxLen = bootstrap.data?.limits.messageMaxLength ?? 500
  const cooldownWindowMs = (bootstrap.data?.limits.messageCooldownSeconds ?? 5) * 1000
  const { secondsRemaining } = useCountdown({ resetAt, onZero: beginResetLock })
  const isIdentityLoading =
    isAuthed && (socketState.nickname === null || socketState.authorUserId === null)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [leftDrawerOpened, setLeftDrawerOpened] = useState(false)
  const [rightDrawerOpened, setRightDrawerOpened] = useState(false)

  if (bootstrap.isLoading) {
    return (
      <Center h="100dvh">
        <Loader type="dots" />
      </Center>
    )
  }

  if (bootstrap.isError) {
    return (
      <Center h="100dvh">
        <Container size="sm" className="ep3-outage-state">
          <Stack gap="xs" align="center" role="status" aria-live="polite" aria-atomic="true">
            <ServerOff size={30} className="ep3-outage-icon" aria-hidden="true" />
            <Text className="ep3-outage-title">Connection lost</Text>
            <Text className="ep3-outage-description">
              We can't reach our network right now.
              <br />
              Check your internet or try again in a few minutes.
            </Text>
            <UnstyledButton
              type="button"
              className="ep3-outage-retry"
              onClick={() => void bootstrap.refetch()}
              disabled={bootstrap.isRefetching}
              aria-busy={bootstrap.isRefetching}
            >
              {bootstrap.isRefetching ? (
                <>
                  <Loader size={12} type="dots" />
                  Retrying…
                </>
              ) : (
                'Try again'
              )}
            </UnstyledButton>
            <Text className="ep3-outage-live">{bootstrap.isRefetching ? 'Retry in progress.' : ''}</Text>
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
  const mentionUsersById = new Map<string, PresenceRosterUser>()
  presenceRoster.forEach((user) => {
    mentionUsersById.set(user.authorUserId, user)
  })
  messages.forEach((message) => {
    if (!mentionUsersById.has(message.authorUserId)) {
      mentionUsersById.set(message.authorUserId, {
        authorUserId: message.authorUserId,
        nickname: message.nickname,
      })
    }
  })
  const mentionUsers = [...mentionUsersById.values()]
  const mentionNicknames = [...new Set(mentionUsers.map((user) => user.nickname))]
  const canModerateInline = moderatorAccess.isModerator && !moderatorAccess.isChecking
  const hasAnyLoadedMessages = messages.length > 0
  const currentAuthorUserId = socketState.authorUserId ?? undefined
  const shouldShowFeedSkeleton =
    authLoading ||
    history.isLoading ||
    (isAuthed && (isIdentityLoading || (socketState.status === 'connecting' && !hasAnyLoadedMessages)))
  const pendingOwnAuthorUserId = userId ? `self:${userId}` : undefined

  const openReport = (m: ChatMessage) => {
    let modalId = ''

    const setSubmittingState = (isSubmitting: boolean) => {
      if (!modalId) return
      modals.updateModal({
        modalId,
        closeOnClickOutside: !isSubmitting,
        closeOnEscape: !isSubmitting,
        withCloseButton: !isSubmitting,
      })
    }

    modalId = modals.open({
      title: 'Report message',
      closeOnClickOutside: true,
      closeOnEscape: true,
      withCloseButton: true,
      children: (
        <ReportMessageModal
          contentPreview={m.content}
          onSubmittingChange={setSubmittingState}
          onCancel={() => modals.close(modalId)}
          onSubmit={async (reason) => {
            const ack = await report.mutateAsync({
              messageId: m.id,
              ...(reason !== undefined ? { reason } : {}),
            })

            if (ack.ok || ack.error === 'already_reported') {
              applyModerationUpdate({ messageId: m.id, moderationStatus: 'under_review' })
              modals.close(modalId)
            }
          }}
        />
      ),
    })
  }

  const showModerationActionError = (error: unknown) => {
    const message =
      error instanceof ModerationApiError
        ? getModerationActionErrorMessage(error.code)
        : getModerationActionErrorMessage()
    notifications.show({
      color: 'red',
      title: 'Moderation action failed',
      message,
    })
  }

  const openMute = (m: ChatMessage) => {
    let modalId = ''
    const setSubmittingState = (isSubmitting: boolean) => {
      if (!modalId) return
      modals.updateModal({
        modalId,
        closeOnClickOutside: !isSubmitting,
        closeOnEscape: !isSubmitting,
        withCloseButton: !isSubmitting,
      })
    }

    modalId = modals.open({
      title: 'Mute user',
      closeOnClickOutside: true,
      closeOnEscape: true,
      withCloseButton: true,
      children: (
        <MuteUserModal
          nickname={m.nickname}
          {...(resetAt !== undefined ? { resetAt } : {})}
          onSubmittingChange={setSubmittingState}
          onCancel={() => modals.close(modalId)}
          onSubmit={async ({ durationMinutes, reason }) => {
            try {
              await moderationActions.muteUser.mutateAsync({
                id: m.authorUserId,
                durationMinutes,
                ...(reason !== undefined ? { reason } : {}),
              })
              notifications.show({
                color: 'green',
                title: 'User muted',
                message: `${m.nickname} was muted for ${durationMinutes} minutes.`,
              })
              modals.close(modalId)
            } catch (error) {
              showModerationActionError(error)
            }
          }}
        />
      ),
    })
  }

  const openBan = (m: ChatMessage) => {
    let modalId = ''
    const setSubmittingState = (isSubmitting: boolean) => {
      if (!modalId) return
      modals.updateModal({
        modalId,
        closeOnClickOutside: !isSubmitting,
        closeOnEscape: !isSubmitting,
        withCloseButton: !isSubmitting,
      })
    }

    modalId = modals.open({
      title: 'Ban user',
      closeOnClickOutside: true,
      closeOnEscape: true,
      withCloseButton: true,
      children: (
        <BanUserModal
          nickname={m.nickname}
          onSubmittingChange={setSubmittingState}
          onCancel={() => modals.close(modalId)}
          onSubmit={async ({ reason }) => {
            try {
              await moderationActions.banUser.mutateAsync({
                id: m.authorUserId,
                ...(reason !== undefined ? { reason } : {}),
              })
              notifications.show({
                color: 'green',
                title: 'User banned',
                message: `${m.nickname} was banned until the next reset.`,
              })
              modals.close(modalId)
            } catch (error) {
              showModerationActionError(error)
            }
          }}
        />
      ),
    })
  }

  return (
    <Box className="ep3-root">
      {isMobile ? (
        <>
          <Drawer
            id="ep3-topics-drawer"
            opened={leftDrawerOpened}
            onClose={() => setLeftDrawerOpened(false)}
            withCloseButton={false}
            size="88%"
            classNames={{
              inner: 'ep3-mobile-drawer-inner',
              content: 'ep3-mobile-drawer-content',
              body: 'ep3-mobile-drawer-body',
            }}
          >
            <Box className="ep3-mobile-panel">
              <LeftSidebar
                className="ep3-left-mobile"
                presenceCount={socketState.presenceCount}
                showPresence={isAuthed && socketState.status === 'connected'}
              />
            </Box>
          </Drawer>
          <Drawer
            id="ep3-details-drawer"
            opened={rightDrawerOpened}
            onClose={() => setRightDrawerOpened(false)}
            withCloseButton={false}
            position="right"
            size="88%"
            classNames={{
              inner: 'ep3-mobile-drawer-inner',
              content: 'ep3-mobile-drawer-content',
              body: 'ep3-mobile-drawer-body',
            }}
          >
            <Box className="ep3-mobile-panel">
              <Box className="ep3-right ep3-right-mobile">
                <RightPanelContent
                  secondsRemaining={secondsRemaining}
                  isAuthed={isAuthed}
                  nickname={socketState.nickname ?? (isAuthed ? 'Anonymous' : null)}
                  nicknameLoading={isIdentityLoading}
                  showModerationAction={moderatorAccess.isModerator && !moderatorAccess.isChecking}
                  onModeration={() => navigate({ to: '/moderation' })}
                  onSignOut={() => {
                    setReplyTarget(null)
                    void signOut()
                  }}
                />
              </Box>
            </Box>
          </Drawer>
        </>
      ) : null}

      {!isMobile ? (
        <LeftSidebar
          presenceCount={socketState.presenceCount}
          showPresence={isAuthed && socketState.status === 'connected'}
        />
      ) : null}

      <Box className="ep3-middle">
        <Box className="ep3-mid-header">
          <Box className="ep3-header-main">
            <ActionIcon
              variant="subtle"
              className="ep3-mobile-panel-toggle"
              onClick={() => setLeftDrawerOpened(true)}
              aria-label="Open topics panel"
              aria-expanded={leftDrawerOpened}
              aria-controls="ep3-topics-drawer"
            >
              <PanelLeftOpen size={16} />
            </ActionIcon>
            <Text className="ep3-room-title">Global</Text>
          </Box>
          <Box className="ep3-header-actions">
            <Text className={`ep3-connected-badge ep3-connected-${connectionState}`}>
              {connectionLabel}
            </Text>
            <ActionIcon
              variant="subtle"
              className="ep3-mobile-panel-toggle"
              onClick={() => setRightDrawerOpened(true)}
              aria-label="Open details panel"
              aria-expanded={rightDrawerOpened}
              aria-controls="ep3-details-drawer"
            >
              <PanelRightOpen size={16} />
            </ActionIcon>
          </Box>
        </Box>

        {isResetting ? (
          <Box className="ep3-feed ep3-chat-state-feed">
            <Container className="ep3-chat-state" size="sm" py="xl">
              <Stack gap="xs" align="center" role="status" aria-live="polite" aria-atomic="true">
                <RefreshCw size={28} className="ep3-chat-state-icon ep3-chat-state-icon-spin" aria-hidden="true" />
                <Text className="ep3-chat-state-title">Resetting chat…</Text>
                <Text className="ep3-chat-state-description">A new UTC day is starting. Please wait a moment.</Text>
              </Stack>
            </Container>
          </Box>
        ) : shouldShowFeedSkeleton ? (
          <Box className="ep3-feed ep3-feed-skeleton">
            <Box className="ep3-day-divider">
              <Box className="ep3-day-divider-line" />
              <Skeleton height={12} width={88} radius={0} />
              <Box className="ep3-day-divider-line" />
            </Box>
            <Stack className="ep3-chat-skeleton-stack" gap="md">
              <Skeleton height={16} width={190} radius={0} />
              <Skeleton height={44} width={130} radius={0} />
              <Skeleton height={16} width={190} radius={0} mt="xs" />
              <Skeleton height={210} width="72%" radius={0} />
              <Skeleton height={16} width={190} radius={0} mt="xs" />
              <Skeleton height={118} width="66%" radius={0} />
            </Stack>
          </Box>
        ) : history.isError ? (
          <Box className="ep3-feed ep3-chat-state-feed">
            <Container className="ep3-chat-state" size="sm" py="xl">
              <Stack gap="xs" align="center" role="status" aria-live="polite" aria-atomic="true">
                {history.isRefetching ? (
                  <>
                    <Loader size={28} type="dots" />
                    <Text className="ep3-chat-state-title">Reconnecting…</Text>
                    <Text className="ep3-chat-state-description">Reconnecting to the server…</Text>
                  </>
                ) : (
                  <>
                    <ServerOff size={28} className="ep3-chat-state-icon" aria-hidden="true" />
                    <Text className="ep3-chat-state-title">Failed to load messages.</Text>
                    <Text className="ep3-chat-state-description">Please try again in a moment.</Text>
                    <UnstyledButton className="ep3-chat-state-retry" type="button" onClick={() => history.refetch()}>
                      Try again
                    </UnstyledButton>
                  </>
                )}
              </Stack>
            </Container>
          </Box>
        ) : (
          <MessageList
            messages={messages}
            currentAuthorUserId={currentAuthorUserId}
            currentPendingAuthorUserId={pendingOwnAuthorUserId}
            canReport={isAuthed && socketState.status === 'connected' && socketState.nickname !== null}
            canReply={isAuthed && socketState.status === 'connected'}
            canModerate={isAuthed && socketState.status === 'connected' && canModerateInline}
            mentionNicknames={mentionNicknames}
            onReport={openReport}
            onReply={(message) => {
              if (!isSameUtcDay(message.createdAt)) {
                return
              }
              const preview = { nickname: message.nickname, content: message.content }
              setReplyTarget({ id: message.id, preview })
            }}
            onMute={openMute}
            onBan={openBan}
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
            isMuted={socketState.isMuted}
            sendDisabled={socketState.status !== 'connected' || isResetting}
            inputLocked={isResetting}
            replyTarget={replyTarget}
            mentionUsers={mentionUsers}
            onClearReply={() => setReplyTarget(null)}
            onSend={(content, replyToMessageId) => {
              const preview = replyTarget?.preview
              if (socketState.nickname && userId) {
                const pendingMessageId = addPendingMessage(content, socketState.nickname, currentAuthorUserId ?? `self:${userId}`, {
                  ...(replyToMessageId ? { replyToMessageId } : {}),
                  ...(preview ? { replyPreview: preview } : {}),
                })
                const sent = socketState.sendMessage(content, replyToMessageId, pendingMessageId)
                if (!sent) {
                  removeMessageById(pendingMessageId)
                }
                return
              }
              socketState.sendMessage(content, replyToMessageId)
            }}
          />
        ) : (
          <Box className="ep3-login-area">
            <Text className="ep3-login-title">Join and chat with strangers</Text>
            <JoinButton onDiscord={signInWithDiscord} onGitHub={signInWithGitHub} />
          </Box>
        )}

      </Box>

      <Box className="ep3-right">
        <RightPanelContent
          secondsRemaining={secondsRemaining}
          isAuthed={isAuthed}
          nickname={socketState.nickname ?? (isAuthed ? 'Anonymous' : null)}
          nicknameLoading={isIdentityLoading}
          showModerationAction={moderatorAccess.isModerator && !moderatorAccess.isChecking}
          onModeration={() => navigate({ to: '/moderation' })}
          onSignOut={() => {
            setReplyTarget(null)
            void signOut()
          }}
        />
      </Box>
    </Box>
  )
}
