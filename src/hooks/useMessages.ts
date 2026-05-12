import { useCallback, useState } from 'react'
import type {
  ChatMessage,
  MessageModeratedPayload,
  MessageNewPayload,
  ModerationStatus,
} from '../types/chat'

let pendingCounter = 0

function nowIso(): string {
  return new Date().toISOString()
}

function toTimestamp(value: string): number | null {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function pendingId(): string {
  const hasRandomUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  const id = hasRandomUuid
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}-${pendingCounter++}`
  return `pending:${id}`
}

export function useMessages() {
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([])
  const [moderationOverrides, setModerationOverrides] = useState<Record<string, ModerationStatus>>({})

  const clearMessages = useCallback(() => {
    setLiveMessages([])
    setModerationOverrides({})
  }, [])

  const addPendingMessage = useCallback((content: string, nickname: string) => {
    const id = pendingId()
    const message: ChatMessage = {
      id,
      content,
      nickname,
      createdAt: nowIso(),
      moderationStatus: 'visible',
      deliveryStatus: 'pending',
    }

    setLiveMessages((previous) => [...previous, message])
    return id
  }, [])

  const removeMessageById = useCallback((id: string) => {
    setLiveMessages((previous) => previous.filter((message) => message.id !== id))
    setModerationOverrides((previous) => {
      if (!(id in previous)) {
        return previous
      }

      const next = { ...previous }
      delete next[id]
      return next
    })
  }, [])

  const confirmOrAddMessage = useCallback((payload: MessageNewPayload) => {
    setLiveMessages((previous) => {
      const confirmedMessage: ChatMessage = {
        id: payload.id,
        content: payload.content,
        nickname: payload.nickname,
        createdAt: payload.createdAt,
        moderationStatus: payload.moderationStatus,
        deliveryStatus: 'confirmed',
      }

      const existingConfirmedIndex = previous.findIndex(
        (message) => message.id === payload.id && message.deliveryStatus !== 'pending',
      )

      if (existingConfirmedIndex >= 0) {
        const next = [...previous]
        next[existingConfirmedIndex] = confirmedMessage
        return next
      }

      const payloadTimestamp = toTimestamp(payload.createdAt)
      let pendingIndex = -1
      let bestScore = Number.POSITIVE_INFINITY

      previous.forEach((message, index) => {
        if (
          message.deliveryStatus !== 'pending' ||
          message.content !== payload.content ||
          message.nickname !== payload.nickname
        ) {
          return
        }

        const pendingTimestamp = toTimestamp(message.createdAt)
        const score =
          payloadTimestamp !== null && pendingTimestamp !== null
            ? Math.abs(payloadTimestamp - pendingTimestamp)
            : index

        if (score < bestScore) {
          bestScore = score
          pendingIndex = index
        }
      })

      if (pendingIndex >= 0) {
        const next = [...previous]
        next[pendingIndex] = confirmedMessage
        return next
      }

      return [...previous, confirmedMessage]
    })
  }, [])

  const applyModerationUpdate = useCallback((payload: MessageModeratedPayload) => {
    setModerationOverrides((previous) => ({
      ...previous,
      [payload.messageId]: payload.moderationStatus,
    }))

    setLiveMessages((previous) =>
      previous.map((message) =>
        message.id === payload.messageId
          ? { ...message, moderationStatus: payload.moderationStatus }
          : message,
      ),
    )
  }, [])

  return {
    liveMessages,
    moderationOverrides,
    clearMessages,
    addPendingMessage,
    removeMessageById,
    confirmOrAddMessage,
    applyModerationUpdate,
  }
}
