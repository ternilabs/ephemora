export type ModerationStatus = 'visible' | 'under_review' | 'hidden'

export interface MessageRow {
  id: string
  content: string
  created_at: string
  moderation_status: ModerationStatus
  nickname: string
  authorUserId: string
  replyToMessageId?: string
  replyPreview?: ReplyPreview
}

export interface MessagesPage {
  messages: MessageRow[]
  nextCursor: string | null
}

export interface MessageNewPayload {
  id: string
  content: string
  nickname: string
  authorUserId: string
  createdAt: string
  moderationStatus: ModerationStatus
  replyToMessageId?: string
  replyPreview?: ReplyPreview
}

export interface MessageModeratedPayload {
  messageId: string
  moderationStatus: ModerationStatus
}

export interface MessageSendPayload {
  content: string
  replyToMessageId?: string
}

export interface ReplyPreview {
  nickname: string
  content: string
}

export interface MessageReportPayload {
  messageId: string
  reason?: string
}

export interface UserIdentityPayload {
  nickname: string
  authorUserId: string
}

export interface RoomPresencePayload {
  count: number
  loggedInCount?: number
  authenticatedCount?: number
}

export interface UserCooldownPayload {
  remainingMs: number
}

export interface UserMutedPayload {
  muteRemainingMs?: number
  remainingMs?: number
}

export interface UserModeratedPayload {
  userId: string
  action: 'ban_user' | 'mute_user' | 'unban_user' | 'banned' | 'muted' | 'unbanned'
  until: string
}

export type SystemErrorCode =
  | 'banned'
  | 'invalid_message_length'
  | 'auth_required'
  | 'internal_error'
  | (string & {})

export interface SystemErrorPayload {
  code: SystemErrorCode
  muteRemainingMs?: number
  remainingMs?: number
}

export type ReportErrorCode =
  | 'already_reported'
  | 'auth_required'
  | 'invalid_payload'
  | 'internal_error'
  | 'no_socket'
  | 'timeout'
  | 'rate_limited'
  | 'message_not_found'
  | 'cannot_report_own_message'
  | (string & {})

export interface ReportAck {
  ok: boolean
  error?: ReportErrorCode
}

export interface ChatMessage {
  id: string
  content: string
  nickname: string
  authorUserId: string
  createdAt: string
  moderationStatus: ModerationStatus
  replyToMessageId?: string
  replyPreview?: ReplyPreview
  deliveryStatus?: 'pending' | 'confirmed'
}

export interface PresenceRosterUser {
  authorUserId: string
  nickname: string
}

export interface PresenceRosterPayload {
  roomId: string
  users: PresenceRosterUser[]
}
