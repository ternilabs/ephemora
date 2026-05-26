import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifications } from '@mantine/notifications'
import { useSocket } from '@/hooks/useSocket'

type Listener = (payload?: unknown) => void

class FakeSocket {
  connected = true
  private listeners = new Map<string, Set<Listener>>()

  on(event: string, listener: Listener) {
    const set = this.listeners.get(event) ?? new Set<Listener>()
    set.add(listener)
    this.listeners.set(event, set)
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener)
  }

  connect() {
    this.connected = true
  }

  disconnect() {
    this.connected = false
  }

  emit(event: string, payload?: unknown) {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    listeners.forEach((listener) => listener(payload))
  }
}

const fakeSocket = new FakeSocket()

vi.mock('@/lib/socket', () => ({
  getSocket: () => fakeSocket,
  disconnectSocket: vi.fn(),
}))

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}))

describe('useSocket blocked-state behavior', () => {
  beforeEach(() => {
    fakeSocket.connect()
    vi.mocked(notifications.show).mockClear()
  })

  it('keeps blocked status after incoming message and still receives realtime payload', () => {
    const onMessageNew = vi.fn()

    const { result } = renderHook(() =>
      useSocket({
        token: 'token',
        userId: 'user-1',
        enabled: true,
        cooldownSeconds: 5,
        onMessageNew,
        onMessageModerated: vi.fn(),
        onReset: vi.fn(),
        onRemovePending: vi.fn(),
      }),
    )

    act(() => {
      fakeSocket.emit('connect')
      fakeSocket.emit('system:error', {
        code: 'auth:muted',
        remainingMs: 5_000,
        until: new Date(Date.now() + 5_000).toISOString(),
      })
    })

    expect(result.current.status).toBe('blocked')

    act(() => {
      fakeSocket.emit('message:new', {
        id: 'm1',
        content: 'hello',
        nickname: 'n',
        authorUserId: 'a',
        createdAt: new Date().toISOString(),
        moderationStatus: 'visible',
      })
    })

    expect(onMessageNew).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('blocked')
    expect(result.current.sendMessage('test')).toBe(false)
  })

  it('keeps blocked status after presence activity updates', () => {
    const { result } = renderHook(() =>
      useSocket({
        token: 'token',
        userId: 'user-1',
        enabled: true,
        cooldownSeconds: 5,
        onMessageNew: vi.fn(),
        onMessageModerated: vi.fn(),
        onReset: vi.fn(),
        onRemovePending: vi.fn(),
      }),
    )

    act(() => {
      fakeSocket.emit('connect')
      fakeSocket.emit('system:error', {
        code: 'auth:banned',
        until: new Date(Date.now() + 5_000).toISOString(),
        remainingMs: 5_000,
      })
    })

    expect(result.current.status).toBe('blocked')
    expect(result.current.blockedKind).toBe('banned')

    act(() => {
      fakeSocket.emit('room:presence', {
        count: 12,
        authenticatedCount: 4,
        loggedInCount: 3,
      })
    })

    expect(result.current.status).toBe('blocked')
    expect(result.current.blockedKind).toBe('banned')
    expect(result.current.presenceCount).toBe(3)
    expect(result.current.sendMessage('test')).toBe(false)
  })

  it('dedupes duplicate mute notifications from separate events', () => {
    renderHook(() =>
      useSocket({
        token: 'token',
        userId: 'user-1',
        enabled: true,
        cooldownSeconds: 5,
        onMessageNew: vi.fn(),
        onMessageModerated: vi.fn(),
        onReset: vi.fn(),
        onRemovePending: vi.fn(),
      }),
    )

    act(() => {
      fakeSocket.emit('connect')
      fakeSocket.emit('user:muted', { remainingMs: 600_000 })
      fakeSocket.emit('system:error', { code: 'auth:muted', remainingMs: 600_000 })
    })

    const mutedCalls = vi.mocked(notifications.show).mock.calls.filter(
      ([payload]) => payload.title === 'Muted',
    )
    expect(mutedCalls).toHaveLength(1)
  })

  it('dedupes duplicate ban notifications from separate events', () => {
    renderHook(() =>
      useSocket({
        token: 'token',
        userId: 'user-1',
        enabled: true,
        cooldownSeconds: 5,
        onMessageNew: vi.fn(),
        onMessageModerated: vi.fn(),
        onReset: vi.fn(),
        onRemovePending: vi.fn(),
      }),
    )

    act(() => {
      fakeSocket.emit('connect')
      fakeSocket.emit('user:moderated', {
        userId: 'user-1',
        action: 'banned',
        until: new Date(Date.now() + 600_000).toISOString(),
      })
      fakeSocket.emit('system:error', { code: 'auth:banned' })
    })

    const bannedCalls = vi.mocked(notifications.show).mock.calls.filter(
      ([payload]) => payload.title === 'Banned',
    )
    expect(bannedCalls).toHaveLength(1)
  })

  it('automatically clears blocked muted state when mute timer expires', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-26T00:00:00.000Z'))

    const { result } = renderHook(() =>
      useSocket({
        token: 'token',
        userId: 'user-1',
        enabled: true,
        cooldownSeconds: 5,
        onMessageNew: vi.fn(),
        onMessageModerated: vi.fn(),
        onReset: vi.fn(),
        onRemovePending: vi.fn(),
      }),
    )

    act(() => {
      fakeSocket.emit('connect')
      fakeSocket.emit('system:error', {
        code: 'auth:muted',
        remainingMs: 1_000,
      })
    })

    expect(result.current.status).toBe('blocked')
    expect(result.current.blockedKind).toBe('muted')

    act(() => {
      vi.advanceTimersByTime(1_500)
    })

    expect(result.current.blockedKind).toBe(null)
    expect(result.current.status).toBe('connected')
    expect(result.current.sendMessage('after mute')).toBe(true)

    vi.useRealTimers()
  })

  it('unblocks banned user immediately on unban moderation event', () => {
    const { result } = renderHook(() =>
      useSocket({
        token: 'token',
        userId: 'user-1',
        enabled: true,
        cooldownSeconds: 5,
        onMessageNew: vi.fn(),
        onMessageModerated: vi.fn(),
        onReset: vi.fn(),
        onRemovePending: vi.fn(),
      }),
    )

    act(() => {
      fakeSocket.emit('connect')
      fakeSocket.emit('system:error', {
        code: 'auth:banned',
        until: new Date(Date.now() + 5_000).toISOString(),
      })
    })

    expect(result.current.status).toBe('blocked')
    expect(result.current.blockedKind).toBe('banned')
    expect(result.current.sendMessage('before unban')).toBe(false)

    act(() => {
      fakeSocket.emit('user:moderated', {
        userId: 'user-1',
        action: 'unban_user',
        until: 'invalid-date',
      })
    })

    expect(result.current.blockedKind).toBe(null)
    expect(result.current.status).toBe('connected')
    expect(result.current.sendMessage('after unban')).toBe(true)
  })
})
