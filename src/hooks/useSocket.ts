import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { notifications } from '@mantine/notifications'
import { disconnectSocket, getSocket } from '../lib/socket'
import type {
  MessageModeratedPayload,
  MessageNewPayload,
  RoomPresencePayload,
  SystemErrorPayload,
  UserCooldownPayload,
  UserIdentityPayload,
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
  onRemovePending: () => void
}

function utcDayStamp(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function getNicknameCacheKey(userId: string): string {
  return `ephemora:nickname:${userId}:${utcDayStamp(new Date())}`
}

function readCachedNickname(userId?: string): string | null {
  if (!userId || typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(getNicknameCacheKey(userId))
  } catch {
    return null
  }
}

function writeCachedNickname(userId: string | undefined, nickname: string): void {
  if (!userId || typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getNicknameCacheKey(userId), nickname)
  } catch {
    // no-op
  }
}

function clearCachedNickname(userId?: string): void {
  if (!userId || typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(getNicknameCacheKey(userId))
  } catch {
    // no-op
  }
}

export function useSocket(options: UseSocketOptions) {
  const { token, userId, enabled, cooldownSeconds, onMessageNew, onMessageModerated, onReset, onRemovePending } = options
  const isAuthed = token.length > 0

  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [nickname, setNickname] = useState<string | null>(() => readCachedNickname(userId))
  const [presenceCount, setPresenceCount] = useState(0)
  const [cooldownUntilMs, setCooldownUntilMs] = useState(0)
  const [muteUntilMs, setMuteUntilMs] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const mountedAtRef = useRef(0)
  const unavailableTimerRef = useRef<number | null>(null)
  const tickerIntervalRef = useRef<number | null>(null)
  const onMessageNewRef = useRef(onMessageNew)
  const onMessageModeratedRef = useRef(onMessageModerated)
  const onResetRef = useRef(onReset)
  const onRemovePendingRef = useRef(onRemovePending)

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
    const clearTicker = () => {
      if (tickerIntervalRef.current !== null) {
        window.clearInterval(tickerIntervalRef.current)
        tickerIntervalRef.current = null
      }
    }

    if (cooldownUntilMs <= Date.now() && muteUntilMs <= Date.now()) {
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
  }, [cooldownUntilMs, muteUntilMs])

  useEffect(() => {
    if (!socket) return

    mountedAtRef.current = Date.now()
    const connectingTimer = window.setTimeout(() => {
      setStatus((currentStatus) => (currentStatus === 'connected' ? currentStatus : 'connecting'))
    }, 0)

    const onConnect = () => {
      if (unavailableTimerRef.current !== null) {
        window.clearTimeout(unavailableTimerRef.current)
        unavailableTimerRef.current = null
      }

      setStatus('connected')
    }

    const onDisconnect = () => {
      setStatus('disconnected')
      setNickname(null)
      setPresenceCount(0)
    }

    const onConnectError = () => {
      const elapsed = Date.now() - mountedAtRef.current
      if (elapsed <= 5_000) {
        setStatus('waking')
      }

      if (unavailableTimerRef.current === null) {
        unavailableTimerRef.current = window.setTimeout(() => {
          setStatus('unavailable')
        }, 15_000)
      }
    }

    const onIdentity = (payload: UserIdentityPayload) => {
      setNickname(payload.nickname)
      writeCachedNickname(userId, payload.nickname)
    }

    const onPresence = (payload: RoomPresencePayload) => {
      setPresenceCount(payload.count)
    }
    const onMessageNewEvent = (payload: MessageNewPayload) => {
      onMessageNewRef.current(payload)
    }
    const onMessageModeratedEvent = (payload: MessageModeratedPayload) => {
      onMessageModeratedRef.current(payload)
    }

    const onCooldown = (payload: UserCooldownPayload) => {
      onRemovePendingRef.current()
      setCooldownUntilMs(Date.now() + payload.remainingMs)
      notifications.show({
        color: 'yellow',
        title: 'Slow down',
        message: `Wait ${Math.ceil(payload.remainingMs / 1000)}s before sending again.`,
      })
    }

    const onMuted = (payload: UserMutedPayload) => {
      onRemovePendingRef.current()
      setMuteUntilMs(Date.now() + payload.muteRemainingMs)
      notifications.show({
        color: 'red',
        title: 'Muted',
        message: `Muted for ${Math.ceil(payload.muteRemainingMs / 1000)}s.`,
      })
    }

    const onSystemError = (payload: SystemErrorPayload) => {
      onRemovePendingRef.current()

      if (payload.code === 'banned') {
        notifications.show({
          color: 'red',
          title: 'Banned',
          message: 'You are temporarily banned until the next reset.',
        })
        return
      }

      if (payload.code === 'invalid_message_length') {
        notifications.show({
          color: 'yellow',
          title: 'Message rejected',
          message: 'Message is empty or too long.',
        })
        return
      }

      if (payload.code === 'auth_required') {
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
      onResetRef.current()
      setNickname(null)
      clearCachedNickname(userId)
      setPresenceCount(0)
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
      socket.off('system:error', onSystemError)

      if (unavailableTimerRef.current !== null) {
        window.clearTimeout(unavailableTimerRef.current)
        unavailableTimerRef.current = null
      }

      setStatus('disconnected')
      setNickname(null)
      setPresenceCount(0)
      disconnectSocket()
    }
  }, [socket, userId])

  const sendMessage = useCallback(
    (content: string) => {
      if (!socket) return

      if (!isAuthed) {
        notifications.show({
          color: 'yellow',
          title: 'Login required',
          message: 'Sign in to send messages.',
        })
        return
      }

      if (status !== 'connected') {
        notifications.show({
          color: 'yellow',
          title: 'Not connected',
          message: 'Please wait for the chat to reconnect before sending.',
        })
        return
      }

      setCooldownUntilMs(Date.now() + cooldownSeconds * 1000)
      socket.emit('message:send', { content })
    },
    [socket, isAuthed, status, cooldownSeconds],
  )

  return {
    socket,
    status,
    nickname,
    presenceCount,
    cooldownRemainingMs: Math.max(0, cooldownUntilMs - nowMs),
    muteRemainingMs: Math.max(0, muteUntilMs - nowMs),
    sendMessage,
  }
}
