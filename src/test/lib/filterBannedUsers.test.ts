import { describe, expect, it } from 'vitest'
import type { BannedUser } from '@/types/moderation'
import { filterBannedUsers } from '@/lib/filterBannedUsers'

const sample: BannedUser[] = [
  {
    id: '1',
    supabase_user_id: 'af52a485-cc6d-4b60-a2e5-e219b0fce0ef',
    status: 'banned',
    banned_until: null,
    ban_reason: 'threat',
    ban_source: 'manual',
    banned_at: null,
  },
  {
    id: '2',
    supabase_user_id: '11111111-2222-3333-4444-555555555555',
    status: 'banned',
    banned_until: null,
    ban_reason: 'spam',
    ban_source: 'manual',
    banned_at: null,
  },
]

describe('filterBannedUsers', () => {
  it('returns all rows for empty query', () => {
    expect(filterBannedUsers(sample, '')).toHaveLength(2)
    expect(filterBannedUsers(sample, '   ')).toHaveLength(2)
  })

  it('matches uuid substring case-insensitively', () => {
    expect(filterBannedUsers(sample, 'AF52A485')).toEqual([sample[0]])
    expect(filterBannedUsers(sample, '2222-3333')).toEqual([sample[1]])
  })

  it('returns empty result when no uuid matches', () => {
    expect(filterBannedUsers(sample, 'no-match')).toEqual([])
  })
})
