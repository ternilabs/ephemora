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

const PENDING_MATCH_WINDOW_MS = 30_000

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

  const addPendingMessage = useCallback(
    (
      content: string,
      nickname: string,
      authorUserId: string,
      reply?: Pick<ChatMessage, 'replyToMessageId' | 'replyPreview'>,
    ) => {
    const id = pendingId()
    const message: ChatMessage = {
      id,
      content,
      nickname,
      authorUserId,
      createdAt: nowIso(),
      moderationStatus: 'visible',
      deliveryStatus: 'pending',
      ...(reply?.replyToMessageId ? { replyToMessageId: reply.replyToMessageId } : {}),
      ...(reply?.replyPreview ? { replyPreview: reply.replyPreview } : {}),
    }

    setLiveMessages((previous) => [...previous, message])
    return id
    },
    [],
  )

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
        authorUserId: payload.authorUserId,
        createdAt: payload.createdAt,
        moderationStatus: payload.moderationStatus,
        deliveryStatus: 'confirmed',
        ...(payload.replyToMessageId ? { replyToMessageId: payload.replyToMessageId } : {}),
        ...(payload.replyPreview ? { replyPreview: payload.replyPreview } : {}),
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
      let pendingIndexWithinWindow = -1
      let bestWindowScore = Number.POSITIVE_INFINITY
      let pendingIndexFallback = -1
      let bestFallbackScore = Number.POSITIVE_INFINITY

      previous.forEach((message, index) => {
        if (
          message.deliveryStatus !== 'pending' ||
          message.nickname !== payload.nickname ||
          message.authorUserId !== payload.authorUserId ||
          message.replyToMessageId !== payload.replyToMessageId ||
          message.content !== payload.content
        ) {
          return
        }

        const pendingTimestamp = toTimestamp(message.createdAt)
        const score =
          payloadTimestamp !== null && pendingTimestamp !== null
            ? Math.abs(payloadTimestamp - pendingTimestamp)
            : index

        if (score < bestFallbackScore) {
          bestFallbackScore = score
          pendingIndexFallback = index
        }

        if (score > PENDING_MATCH_WINDOW_MS) {
          return
        }

        if (score < bestWindowScore) {
          bestWindowScore = score
          pendingIndexWithinWindow = index
        }
      })

      const pendingIndex = pendingIndexWithinWindow >= 0 ? pendingIndexWithinWindow : pendingIndexFallback
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
