import { describe, expect, it } from 'vitest'
import type { BannedUser } from '@/types/moderation'
import { filterBannedUsers } from '@/lib/filterBannedUsers'

describe('banned user search normalization contract', () => {
  it('normalizes query before filtering', () => {
    const users: BannedUser[] = [
      {
        id: '1',
        supabase_user_id: 'ABC-123',
        status: 'banned',
        banned_until: null,
        ban_reason: null,
        ban_source: null,
        banned_at: null,
      },
      {
        id: '2',
        supabase_user_id: 'XYZ-999',
        status: 'banned',
        banned_until: null,
        ban_reason: null,
        ban_source: null,
        banned_at: null,
      },
    ]

    const result = filterBannedUsers(users, '  abc  ')
    expect(result).toHaveLength(1)
    expect(result[0]!.supabase_user_id).toBe('ABC-123')
  })
})
