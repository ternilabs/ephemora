import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { notifications } from '@mantine/notifications'
import { disconnectSocket, getSocket } from '../lib/socket'
import {
  getMuteRemainingMs,
  getMutedConnectRemainingMs,
  getMutedNotificationMessage,
  isBannedConnectError,
  isMutedConnectError,
} from '../lib/socketModeration'
import type {
  MessageModeratedPayload,
  MessageNewPayload,
  MessageSendPayload,
  RoomPresencePayload,
  SystemErrorPayload,
  UserCooldownPayload,
  UserIdentityPayload,
  UserModeratedPayload,
  UserMutedPayload,
} from '../types/chat'

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'waking' | 'unavailable'

interface UseSocketOptions {
  token: string
  userId?: string
  enabled: boolean
  cooldownSeconds: number
  onMessageNew: (payload: MessageNewPayload) => void
  onMessageModerated: (payload: MessageModeratedPayload) => void
  onReset: () => void
  onRemovePending: (pendingId?: string) => void
}

function utcDayStamp(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

interface CachedIdentity {
  nickname: string
  authorUserId: string
}

function getMuteCacheKey(userId: string): string {
  return `ephemora:mute-until:${userId}`
}

function getIdentityCacheKey(userId: string): string {
  return `ephemora:identity:${userId}:${utcDayStamp(new Date())}`
}

function readCachedIdentity(userId?: string): CachedIdentity | null {
  if (!userId || typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getIdentityCacheKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<CachedIdentity>
    if (typeof parsed.nickname !== 'string' || typeof parsed.authorUserId !== 'string') {
      return null
    }

    return { nickname: parsed.nickname, authorUserId: parsed.authorUserId }
  } catch {
    return null
  }
}

function writeCachedIdentity(userId: string | undefined, identity: CachedIdentity): void {
  if (!userId || typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getIdentityCacheKey(userId), JSON.stringify(identity))
  } catch {
    // no-op
  }
}

function readCachedMuteUntil(userId?: string): number {
  if (!userId || typeof window === 'undefined') return 0

  try {
    const raw = window.localStorage.getItem(getMuteCacheKey(userId))
    if (!raw) return 0
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return 0
    return parsed > Date.now() ? parsed : 0
  } catch {
    return 0
  }
}

function writeCachedMuteUntil(userId: string | undefined, muteUntilMs: number): void {
  if (!userId || typeof window === 'undefined') return

  try {
    if (muteUntilMs > Date.now()) {
      window.localStorage.setItem(getMuteCacheKey(userId), String(muteUntilMs))
    } else {
      window.localStorage.removeItem(getMuteCacheKey(userId))
    }
  } catch {
    // no-op
  }
}

export function useSocket(options: UseSocketOptions) {
  const { token, userId, enabled, cooldownSeconds, onMessageNew, onMessageModerated, onReset, onRemovePending } = options
  const isAuthed = token.length > 0
  const cachedIdentity = useMemo(() => readCachedIdentity(userId), [userId])

  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [nickname, setNickname] = useState<string | null>(() => cachedIdentity?.nickname ?? null)
  const [authorUserId, setAuthorUserId] = useState<string | null>(() => cachedIdentity?.authorUserId ?? null)
  const [presenceCount, setPresenceCount] = useState(0)
  const [cooldownUntilMs, setCooldownUntilMs] = useState(0)
  const [muteUntilMs, setMuteUntilMs] = useState(() => readCachedMuteUntil(userId))
  const [muteFallbackActive, setMuteFallbackActive] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const mountedAtRef = useRef(0)
  const unavailableTimerRef = useRef<number | null>(null)
  const tickerIntervalRef = useRef<number | null>(null)
  const onMessageNewRef = useRef(onMessageNew)
  const onMessageModeratedRef = useRef(onMessageModerated)
  const onResetRef = useRef(onReset)
  const onRemovePendingRef = useRef(onRemovePending)
  const pendingMessageIdsRef = useRef<string[]>([])
  const authorUserIdRef = useRef<string | null>(authorUserId)
  const lastUserIdRef = useRef(userId)

  const socket: Socket | null = useMemo(() => {
    if (!enabled) return null
    return getSocket(token)
  }, [enabled, token])

  useEffect(() => {
    onMessageNewRef.current = onMessageNew
    onMessageModeratedRef.current = onMessageModerated
    onResetRef.current = onReset
    onRemovePendingRef.current = onRemovePending
  }, [onMessageNew, onMessageModerated, onReset, onRemovePending])

  useEffect(() => {
    authorUserIdRef.current = authorUserId
  }, [authorUserId])

  useEffect(() => {
    if (lastUserIdRef.current === userId) return

    lastUserIdRef.current = userId
    const cachedMuteUntilMs = readCachedMuteUntil(userId)
    setMuteUntilMs(cachedMuteUntilMs)
    setMuteFallbackActive(false)
    setNowMs(Date.now())
  }, [userId])

  useEffect(() => {
    const clearTicker = () => {
      if (tickerIntervalRef.current !== null) {
        window.clearInterval(tickerIntervalRef.current)
        tickerIntervalRef.current = null
      }
    }

    if (cooldownUntilMs <= Date.now() && muteUntilMs <= Date.now()) {
      writeCachedMuteUntil(userId, 0)
      clearTicker()
      return
    }

    if (tickerIntervalRef.current === null) {
      tickerIntervalRef.current = window.setInterval(() => {
        const now = Date.now()
        setNowMs(now)

        if (cooldownUntilMs <= now && muteUntilMs <= now) {
          clearTicker()
        }
      }, 250)
    }

    return () => {
      clearTicker()
    }
  }, [cooldownUntilMs, muteUntilMs, userId])

  useEffect(() => {
    if (!socket) return

    mountedAtRef.current = Date.now()
    const connectingTimer = window.setTimeout(() => {
      setStatus((currentStatus) => (currentStatus === 'connected' ? currentStatus : 'connecting'))
    }, 0)

    const clearUnavailableTimer = () => {
      if (unavailableTimerRef.current !== null) {
        window.clearTimeout(unavailableTimerRef.current)
        unavailableTimerRef.current = null
      }
    }

    const markConnectedActivity = () => {
      clearUnavailableTimer()
      setStatus((currentStatus) => (currentStatus === 'connected' ? currentStatus : 'connected'))
    }

    const applyMuteState = (remainingMs: number | null): void => {
      if (remainingMs === null) {
        const cachedMuteUntilMs = readCachedMuteUntil(userId)
        if (cachedMuteUntilMs > Date.now()) {
          setMuteUntilMs(cachedMuteUntilMs)
          setMuteFallbackActive(false)
          setNowMs(Date.now())
          return
        }

        setMuteUntilMs(0)
        setMuteFallbackActive(true)
        setNowMs(Date.now())
        return
      }

      const nextMuteUntilMs = Date.now() + Math.max(0, remainingMs)
      setMuteFallbackActive(false)
      setMuteUntilMs(nextMuteUntilMs)
      setNowMs(Date.now())
      writeCachedMuteUntil(userId, nextMuteUntilMs)
    }

    const syncMutedUserState = (remainingMs: number | null): void => {
      clearUnavailableTimer()
      consumePendingMessage()
      applyMuteState(remainingMs)
      setStatus('connected')
    }

    const consumePendingMessage = () => {
      const [pendingMessageId] = pendingMessageIdsRef.current
      if (!pendingMessageId) return
      pendingMessageIdsRef.current = pendingMessageIdsRef.current.filter((id) => id !== pendingMessageId)
      onRemovePendingRef.current(pendingMessageId)
    }

    const onConnect = () => {
      clearUnavailableTimer()

      setStatus('connected')
      setMuteFallbackActive(false)
    }

    const onDisconnect = () => {
      setStatus('disconnected')
      setPresenceCount(0)
    }

    const onConnectError = (error: unknown) => {
      if (isBannedConnectError(error)) {
        consumePendingMessage()
        notifications.show({
          color: 'red',
          title: 'Banned',
          message: 'You are temporarily banned until the next reset.',
        })
        return
      }

      if (isMutedConnectError(error)) {
        const muteRemainingMs = getMutedConnectRemainingMs(error)
        syncMutedUserState(muteRemainingMs)
        notifications.show({
          color: 'yellow',
          title: 'Muted',
          message: getMutedNotificationMessage(muteRemainingMs),
        })
        return
      }

      const cachedMuteUntilMs = readCachedMuteUntil(userId)
      if (cachedMuteUntilMs > Date.now()) {
        syncMutedUserState(cachedMuteUntilMs - Date.now())
        return
      }

      const elapsed = Date.now() - mountedAtRef.current
      if (elapsed <= 5_000) {
        setStatus('waking')
      }

      if (unavailableTimerRef.current === null) {
        unavailableTimerRef.current = window.setTimeout(() => {
          if (!socket.connected) {
            setStatus('unavailable')
          }
          unavailableTimerRef.current = null
        }, 15_000)
      }
    }

    const onIdentity = (payload: UserIdentityPayload) => {
      markConnectedActivity()
      setMuteFallbackActive(false)
      setNickname(payload.nickname)
      setAuthorUserId(payload.authorUserId)
      writeCachedIdentity(userId, {
        nickname: payload.nickname,
        authorUserId: payload.authorUserId,
      })
    }

    const onPresence = (payload: RoomPresencePayload) => {
      markConnectedActivity()
      setMuteFallbackActive(false)
      const loggedInCount = payload.loggedInCount ?? payload.authenticatedCount ?? payload.count
      setPresenceCount(loggedInCount)
    }
    const onMessageNewEvent = (payload: MessageNewPayload) => {
      markConnectedActivity()
      onMessageNewRef.current(payload)
    }
    const onMessageModeratedEvent = (payload: MessageModeratedPayload) => {
      markConnectedActivity()
      onMessageModeratedRef.current(payload)
    }

    const onCooldown = (payload: UserCooldownPayload) => {
      markConnectedActivity()
      consumePendingMessage()
      setCooldownUntilMs(Date.now() + payload.remainingMs)
      notifications.show({
        color: 'yellow',
        title: 'Slow down',
        message: `Wait ${Math.ceil(payload.remainingMs / 1000)}s before sending again.`,
      })
    }

    const onMuted = (payload: UserMutedPayload) => {
      markConnectedActivity()
      const muteRemainingMs = getMuteRemainingMs(payload)
      syncMutedUserState(muteRemainingMs)
      notifications.show({
        color: 'red',
        title: 'Muted',
        message: getMutedNotificationMessage(muteRemainingMs),
      })
    }

    const onUserModerated = (payload: UserModeratedPayload) => {
      markConnectedActivity()
      const matchesCurrentUser =
        (userId !== undefined && payload.userId === userId) ||
        (authorUserIdRef.current !== null && payload.userId === authorUserIdRef.current)

      if (!matchesCurrentUser) return

      const untilMs = Date.parse(payload.until)
      if (!Number.isFinite(untilMs)) return

      const remainingMs = Math.max(0, untilMs - Date.now())
      syncMutedUserState(remainingMs)

      if (payload.action === 'banned') {
        notifications.show({
          color: 'red',
          title: 'Banned',
          message: 'You are temporarily banned until the next reset.',
        })
        return
      }

      notifications.show({
        color: 'yellow',
        title: 'Muted',
        message: getMutedNotificationMessage(remainingMs),
      })
    }

    const onSystemError = (payload: SystemErrorPayload) => {
      markConnectedActivity()
      consumePendingMessage()
      const code = payload.code.toLowerCase()
      if (code === 'banned' || code === 'auth:banned') {
        notifications.show({
          color: 'red',
          title: 'Banned',
          message: 'You are temporarily banned until the next reset.',
        })
        return
      }

      if (code === 'muted' || code === 'auth:muted') {
        const muteRemainingMs = getMuteRemainingMs(payload)
        syncMutedUserState(muteRemainingMs)
        notifications.show({
          color: 'yellow',
          title: 'Muted',
          message: getMutedNotificationMessage(muteRemainingMs),
        })
        return
      }

      if (code === 'invalid_message_length') {
        notifications.show({
          color: 'yellow',
          title: 'Message rejected',
          message: 'Message is empty or too long.',
        })
        return
      }

      if (code === 'auth_required' || code === 'auth:required') {
        notifications.show({
          color: 'yellow',
          title: 'Login required',
          message: 'Sign in to send messages.',
        })
        return
      }

      notifications.show({
        color: 'red',
        title: 'Error',
        message: `System error: ${payload.code}`,
      })
    }

    const onResetEvent = () => {
      markConnectedActivity()
      onResetRef.current()
      setPresenceCount(0)
      setMuteUntilMs(0)
      setMuteFallbackActive(false)
      writeCachedMuteUntil(userId, 0)
      notifications.show({
        color: 'green',
        title: 'Daily reset',
        message: 'The room faded. New day, new nicknames.',
      })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('user:identity', onIdentity)
    socket.on('room:presence', onPresence)
    socket.on('message:new', onMessageNewEvent)
    socket.on('message:moderated', onMessageModeratedEvent)
    socket.on('chat:reset', onResetEvent)
    socket.on('user:cooldown', onCooldown)
    socket.on('user:muted', onMuted)
    socket.on('user:moderated', onUserModerated)
    socket.on('system:error', onSystemError)

    socket.connect()

    return () => {
      window.clearTimeout(connectingTimer)

      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('user:identity', onIdentity)
      socket.off('room:presence', onPresence)
      socket.off('message:new', onMessageNewEvent)
      socket.off('message:moderated', onMessageModeratedEvent)
      socket.off('chat:reset', onResetEvent)
      socket.off('user:cooldown', onCooldown)
      socket.off('user:muted', onMuted)
      socket.off('user:moderated', onUserModerated)
      socket.off('system:error', onSystemError)

      clearUnavailableTimer()

      setStatus('disconnected')
      setNickname(null)
      setAuthorUserId(null)
      setPresenceCount(0)
      disconnectSocket()
    }
  }, [socket, userId])

  const sendMessage = useCallback(
    (content: string, replyToMessageId?: string, pendingMessageId?: string): boolean => {
      if (!socket) return false

      if (!isAuthed) {
        notifications.show({
          color: 'yellow',
          title: 'Login required',
          message: 'Sign in to send messages.',
        })
        return false
      }

      if (status !== 'connected') {
        notifications.show({
          color: 'yellow',
          title: 'Not connected',
          message: 'Please wait for the chat to reconnect before sending.',
        })
        return false
      }

      setCooldownUntilMs(Date.now() + cooldownSeconds * 1000)
      if (pendingMessageId) {
        pendingMessageIdsRef.current = [...pendingMessageIdsRef.current, pendingMessageId]
      }
      const payload: MessageSendPayload = replyToMessageId
        ? { content, replyToMessageId }
        : { content }
      socket.emit('message:send', payload)
      return true
    },
    [socket, isAuthed, status, cooldownSeconds],
  )

  const effectiveNickname = nickname ?? cachedIdentity?.nickname ?? null
  const effectiveAuthorUserId = authorUserId ?? cachedIdentity?.authorUserId ?? null
  const muteRemainingMs = Math.max(0, muteUntilMs - nowMs)
  const isMuted = muteFallbackActive || muteRemainingMs > 0

  return {
    socket,
    status,
    nickname: effectiveNickname,
    authorUserId: effectiveAuthorUserId,
    presenceCount,
    cooldownRemainingMs: Math.max(0, cooldownUntilMs - nowMs),
    muteRemainingMs,
    isMuted,
    sendMessage,
  }
}
