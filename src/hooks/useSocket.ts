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
  enabled: boolean
  cooldownSeconds: number
  onMessageNew: (payload: MessageNewPayload) => void
  onMessageModerated: (payload: MessageModeratedPayload) => void
  onReset: () => void
  onRemovePending: () => void
}

export function useSocket(options: UseSocketOptions) {
  const { token, enabled, cooldownSeconds, onMessageNew, onMessageModerated, onReset, onRemovePending } = options
  const isAuthed = token.length > 0

  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [nickname, setNickname] = useState<string | null>(null)
  const [presenceCount, setPresenceCount] = useState(0)
  const [cooldownUntilMs, setCooldownUntilMs] = useState(0)
  const [muteUntilMs, setMuteUntilMs] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const mountedAtRef = useRef(0)
  const unavailableTimerRef = useRef<number | null>(null)

  const socket: Socket | null = useMemo(() => {
    if (!enabled) return null
    return getSocket(token)
  }, [enabled, token])

  useEffect(() => {
    if (cooldownUntilMs <= Date.now() && muteUntilMs <= Date.now()) {
      return
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 250)

    return () => {
      window.clearInterval(intervalId)
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
    }

    const onPresence = (payload: RoomPresencePayload) => {
      setPresenceCount(payload.count)
    }

    const onCooldown = (payload: UserCooldownPayload) => {
      onRemovePending()
      setCooldownUntilMs(Date.now() + payload.remainingMs)
      notifications.show({
        color: 'yellow',
        title: 'Slow down',
        message: `Wait ${Math.ceil(payload.remainingMs / 1000)}s before sending again.`,
      })
    }

    const onMuted = (payload: UserMutedPayload) => {
      onRemovePending()
      setMuteUntilMs(Date.now() + payload.muteRemainingMs)
      notifications.show({
        color: 'red',
        title: 'Muted',
        message: 'Muted for 5 minutes.',
      })
    }

    const onSystemError = (payload: SystemErrorPayload) => {
      onRemovePending()

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
      onReset()
      setNickname(null)
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
    socket.on('message:new', onMessageNew)
    socket.on('message:moderated', onMessageModerated)
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
      socket.off('message:new', onMessageNew)
      socket.off('message:moderated', onMessageModerated)
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
  }, [socket, onMessageNew, onMessageModerated, onReset, onRemovePending])

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

      setCooldownUntilMs(Date.now() + cooldownSeconds * 1000)
      socket.emit('message:send', { content })
    },
    [socket, isAuthed, cooldownSeconds],
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
