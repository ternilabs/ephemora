import type { BannedUser, ModerationAction, ModerationReport } from '../types/moderation'
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_REALTIME_URL as string | undefined

if (!BASE) throw new Error('Missing VITE_REALTIME_URL')

export class ModerationApiError extends Error {
  status: number
  path: string

  constructor(status: number, path: string, details?: string) {
    super(details ? `Moderation API ${status}: ${path} (${details})` : `Moderation API ${status}: ${path}`)
    this.name = 'ModerationApiError'
    this.status = status
    this.path = path
  }
}

function assertValidReportUserIds(reports: ModerationReport[]): ModerationReport[] {
  reports.forEach((report, index) => {
    if (typeof report.supabase_user_id === 'string' && report.supabase_user_id.trim().length > 0) {
      return
    }

    const reportLabel = report.id || `index ${index}`
    throw new Error(`Moderation API payload invalid: report ${reportLabel} missing supabase_user_id`)
  })

  return reports
}

async function moderationFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw new ModerationApiError(401, '/auth/session', sessionError.message)
  }

  const session = data.session
  const token = session?.access_token ?? ''

  const headers = new Headers(options?.headers)
  if (options?.body !== undefined && options?.body !== null) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) throw new ModerationApiError(res.status, path)

  if (res.status === 204) {
    return {} as T
  }

  return res.json() as Promise<T>
}

export const moderationApi = {
  checkAccess: async (signal?: AbortSignal) => {
    const access = await moderationFetch<{ ok: boolean; isModerator: boolean }>(
      '/moderation/access',
      signal ? { signal } : undefined,
    )

    if (!access.isModerator) {
      throw new ModerationApiError(403, '/moderation/access')
    }

    return true
  },
  getReports: async (signal?: AbortSignal) => {
    const reports = await moderationFetch<ModerationReport[]>(
      '/moderation/reports',
      signal ? { signal } : undefined,
    )
    return assertValidReportUserIds(reports)
  },
  getAiActions: (signal?: AbortSignal) =>
    moderationFetch<ModerationAction[]>('/moderation/ai-actions', signal ? { signal } : undefined),
  getBannedUsers: (signal?: AbortSignal, query?: string) => {
    const normalizedQuery = query?.trim() ?? ''
    const search = normalizedQuery.length > 0 ? `?q=${encodeURIComponent(normalizedQuery)}` : ''
    return moderationFetch<BannedUser[]>(
      `/moderation/banned-users${search}`,
      signal ? { signal } : undefined,
    )
  },
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
  unbanUser: async (supabaseUserId: string, fallbackRecordId?: string) => {
    try {
      return await moderationFetch(`/moderation/users/${supabaseUserId}/unban`, { method: 'POST' })
    } catch (error) {
      const recordId = fallbackRecordId?.trim()
      if (!(error instanceof ModerationApiError) || !recordId || recordId === supabaseUserId) {
        throw error
      }

      if (error.status !== 404) {
        throw error
      }

      return moderationFetch(`/moderation/users/${recordId}/unban`, { method: 'POST' })
    }
  },
}
