import { describe, expect, it } from 'vitest'
import { getModerationActionErrorMessage, shouldScheduleResetFallback } from '@/routes/index'

describe('chat moderation action messaging', () => {
  it('renders deterministic notifications for known error codes', () => {
    expect(getModerationActionErrorMessage('validation_failed')).toBe('Invalid mute duration or reset window has expired.')
    expect(getModerationActionErrorMessage('not_found')).toBe('User is no longer available.')
    expect(getModerationActionErrorMessage('forbidden')).toBe('Moderator access is required for this action.')
    expect(getModerationActionErrorMessage('anything_else')).toBe('Server error while applying moderation action.')
  })

  it('returns fallback notification for unknown and undefined codes', () => {
    expect(getModerationActionErrorMessage()).toBe('Server error while applying moderation action.')
    expect(getModerationActionErrorMessage('internal_error')).toBe('Server error while applying moderation action.')
  })

  it('schedules reset fallback only while resetting and reset request is not started', () => {
    expect(shouldScheduleResetFallback(true, false)).toBe(true)
    expect(shouldScheduleResetFallback(false, false)).toBe(false)
    expect(shouldScheduleResetFallback(true, true)).toBe(false)
    expect(shouldScheduleResetFallback(false, true)).toBe(false)
  })
})
