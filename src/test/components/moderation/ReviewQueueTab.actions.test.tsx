import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MantineProvider } from '@mantine/core'
import type { ModerationReport } from '@/types/moderation'
import ReviewQueueTab from '@/components/moderation/ReviewQueueTab'

vi.mock('@/hooks/useModerationReports', () => ({
  useModerationReports: () => ({
    isLoading: false,
    isError: false,
    data: [
      {
        id: 'r1',
        supabase_user_id: 'user-1',
        content: 'message',
        report_count: 1,
        moderation_status: 'visible',
        ai_moderation_status: 'harmful',
        ai_verdict: 'harmful',
        ai_confidence: 0.9,
        ai_reason: 'reason',
        ai_severity: 'harmful',
        ai_intent: 'hostile',
        ai_targeting: 'individual',
        ai_categories: ['violence'],
        policy_action: 'hide_ban',
        policy_reason: 'policy reason',
        offense_count_at_decision: 0,
        manual_review_status: 'none',
        created_at: new Date().toISOString(),
        daily_identities: { nickname: 'nick' },
      } satisfies ModerationReport,
    ],
    error: null,
  }),
}))

vi.mock('@/hooks/useBannedUsers', () => ({
  useBannedUsers: () => ({
    isError: true,
    data: undefined,
  }),
}))

vi.mock('@/hooks/useModerationActions', () => ({
  useModerationActions: () => ({
    hideMessage: { isPending: false, mutate: vi.fn() },
    restoreMessage: { isPending: false, mutate: vi.fn() },
    markReviewed: { isPending: false, mutate: vi.fn() },
    banUser: { isPending: false, mutate: vi.fn() },
    unbanUser: { isPending: false, mutate: vi.fn() },
  }),
}))

vi.mock('@/components/moderation/ModerationMessageCard', () => ({
  default: (props: { disableBanAction: boolean }) => (
    <div data-testid="moderation-card" data-ban-disabled={props.disableBanAction ? 'true' : 'false'} />
  ),
}))

describe('ReviewQueueTab action guards', () => {
  it('disables ban action when banned-users query is in error state', () => {
    render(
      <MantineProvider>
        <ReviewQueueTab enabled />
      </MantineProvider>,
    )
    expect(screen.getByTestId('moderation-card')).toHaveAttribute('data-ban-disabled', 'true')
  })
})
