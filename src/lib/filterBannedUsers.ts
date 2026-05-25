import type { BannedUser } from '../types/moderation'

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function filterBannedUsers(users: BannedUser[], query: string): BannedUser[] {
  const normalized = normalizeQuery(query)
  if (normalized.length === 0) return users

  return users.filter((user) => user.supabase_user_id.toLowerCase().includes(normalized))
}
