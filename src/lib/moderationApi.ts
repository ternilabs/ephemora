import type { BannedUser, ModerationAction, ModerationReport } from '../types/moderation'
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_REALTIME_URL as string | undefined

if (!BASE) throw new Error('Missing VITE_REALTIME_URL')

async function moderationFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session
  const token = session?.access_token ?? ''

  const headers = new Headers(options?.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) throw new Error(`Moderation API ${res.status}: ${path}`)

  return res.json() as Promise<T>
}

export const moderationApi = {
  getReports: () => moderationFetch<ModerationReport[]>('/moderation/reports'),
  getAiActions: () => moderationFetch<ModerationAction[]>('/moderation/ai-actions'),
  getBannedUsers: () => moderationFetch<BannedUser[]>('/moderation/banned-users'),
  hideMessage: (id: string) => moderationFetch(`/moderation/messages/${id}/hide`, { method: 'POST' }),
  restoreMessage: (id: string) =>
    moderationFetch(`/moderation/messages/${id}/restore`, { method: 'POST' }),
  markReviewed: (id: string) =>
    moderationFetch(`/moderation/messages/${id}/reviewed`, { method: 'POST' }),
  banUser: (id: string, reason?: string) =>
    moderationFetch(`/moderation/users/${id}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  unbanUser: (id: string) => moderationFetch(`/moderation/users/${id}/unban`, { method: 'POST' }),
}
