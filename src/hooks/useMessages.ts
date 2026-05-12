import { useCallback, useState } from 'react'
import type {
  ChatMessage,
  MessageModeratedPayload,
  MessageNewPayload,
  ModerationStatus,
} from '../types/chat'

function nowIso(): string {
  return new Date().toISOString()
}

function pendingId(): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`
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
  }, [])

  const confirmOrAddMessage = useCallback((payload: MessageNewPayload) => {
    setLiveMessages((previous) => {
      const pendingIndex = previous.findIndex(
        (message) =>
          message.deliveryStatus === 'pending' &&
          message.content === payload.content &&
          message.nickname === payload.nickname,
      )

      if (pendingIndex >= 0) {
        const next = [...previous]
        next[pendingIndex] = {
          id: payload.id,
          content: payload.content,
          nickname: payload.nickname,
          createdAt: payload.createdAt,
          moderationStatus: payload.moderationStatus,
          deliveryStatus: 'confirmed',
        }
        return next
      }

      return [
        ...previous,
        {
          id: payload.id,
          content: payload.content,
          nickname: payload.nickname,
          createdAt: payload.createdAt,
          moderationStatus: payload.moderationStatus,
          deliveryStatus: 'confirmed',
        },
      ]
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
