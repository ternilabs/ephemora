export type ModerationStatus = 'visible' | 'under_review' | 'hidden'

export interface MessageRow {
  id: string
  content: string
  created_at: string
  moderation_status: ModerationStatus
  nickname: string
}

export interface MessagesPage {
  messages: MessageRow[]
  nextCursor: string | null
}

export interface MessageNewPayload {
  id: string
  content: string
  nickname: string
  createdAt: string
  moderationStatus: ModerationStatus
}

export interface MessageModeratedPayload {
  messageId: string
  moderationStatus: ModerationStatus
}

export interface UserIdentityPayload {
  nickname: string
}

export interface RoomPresencePayload {
  count: number
}

export interface UserCooldownPayload {
  remainingMs: number
}

export interface UserMutedPayload {
  muteRemainingMs: number
}

export interface SystemErrorPayload {
  code: string
}

export interface ReportAck {
  ok: boolean
  error?: string
}
