import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { PresenceRosterPayload, PresenceRosterUser } from '../types/chat'

function normalizeUsers(users: PresenceRosterUser[]): PresenceRosterUser[] {
  const byId = new Map<string, PresenceRosterUser>()
  for (const user of users) {
    if (!user.authorUserId || !user.nickname) continue
    byId.set(user.authorUserId, user)
  }

  return [...byId.values()].sort((first, second) => first.nickname.localeCompare(second.nickname))
}

export function usePresenceRoster(socket: Socket | null): PresenceRosterUser[] {
  const [users, setUsers] = useState<PresenceRosterUser[]>([])
  const roomId = 'global'

  useEffect(() => {
    if (!socket) return

    const requestRoster = () => {
      socket.emit('presence:roster:request', { roomId })
    }

    const onRoster = (payload: PresenceRosterPayload) => {
      if (payload.roomId !== roomId) return
      setUsers(normalizeUsers(payload.users))
    }

    const onJoin = (payload: { roomId: string; user: PresenceRosterUser }) => {
      if (payload.roomId !== roomId) return
      setUsers((previous) => normalizeUsers([...previous, payload.user]))
    }

    const onLeave = (payload: { roomId: string; authorUserId: string }) => {
      if (payload.roomId !== roomId) return
      setUsers((previous) => previous.filter((user) => user.authorUserId !== payload.authorUserId))
    }

    const onDisconnect = () => {
      setUsers([])
    }

    socket.on('presence:roster', onRoster)
    socket.on('presence:join', onJoin)
    socket.on('presence:leave', onLeave)
    socket.on('connect', requestRoster)
    socket.on('disconnect', onDisconnect)
    requestRoster()

    return () => {
      socket.off('presence:roster', onRoster)
      socket.off('presence:join', onJoin)
      socket.off('presence:leave', onLeave)
      socket.off('connect', requestRoster)
      socket.off('disconnect', onDisconnect)
      setUsers([])
    }
  }, [roomId, socket])

  if (!socket) return []
  return users
}
