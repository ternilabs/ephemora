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

function getMessageMatchScore(
  payload: MessageNewPayload,
  message: ChatMessage,
  payloadTimestamp: number | null,
  index: number,
): number | null {
  if (
    message.deliveryStatus !== 'pending' ||
    message.nickname !== payload.nickname ||
    message.authorUserId !== payload.authorUserId ||
    message.replyToMessageId !== payload.replyToMessageId
  ) {
    return null
  }

  const pendingTimestamp = toTimestamp(message.createdAt)
  if (payloadTimestamp !== null && pendingTimestamp !== null) {
    return Math.abs(payloadTimestamp - pendingTimestamp)
  }

  return index
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
      let strictPendingIndex = -1
      let strictBestScore = Number.POSITIVE_INFINITY
      let relaxedPendingIndex = -1
      let relaxedBestScore = Number.POSITIVE_INFINITY

      previous.forEach((message, index) => {
        const score = getMessageMatchScore(payload, message, payloadTimestamp, index)
        if (score === null || score > PENDING_MATCH_WINDOW_MS) {
          return
        }

        if (message.content === payload.content && score < strictBestScore) {
          strictBestScore = score
          strictPendingIndex = index
          return
        }

        if (score < relaxedBestScore) {
          relaxedBestScore = score
          relaxedPendingIndex = index
        }
      })

      const pendingIndex = strictPendingIndex >= 0 ? strictPendingIndex : relaxedPendingIndex
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
