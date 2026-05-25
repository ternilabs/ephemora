import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MantineProvider } from '@mantine/core'
import ModerationMessageCard from '@/components/moderation/ModerationMessageCard'
import type { ModerationReport } from '@/types/moderation'

const report: ModerationReport = {
  id: 'report-1',
  supabase_user_id: 'user-1',
  content: 'message',
  report_count: 1,
  moderation_status: 'visible',
  ai_moderation_status: 'harmful',
  ai_verdict: 'harmful',
  ai_confidence: 0.95,
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
}

describe('ModerationMessageCard details toggle accessibility', () => {
  it('exposes aria-expanded and aria-controls', async () => {
    render(
      <MantineProvider>
        <ModerationMessageCard
          report={report}
          onHide={vi.fn()}
          onRestore={vi.fn()}
          onReviewed={vi.fn()}
          onBan={vi.fn()}
          hideLoading={false}
          restoreLoading={false}
          reviewedLoading={false}
          banLoading={false}
          disableHideAction={false}
          disableRestoreAction={false}
          disableReviewedAction={false}
          disableBanAction={false}
        />
      </MantineProvider>,
    )

    const detailsButton = screen.getByRole('button', { name: /details/i })
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false')
    const controlsId = detailsButton.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(document.getElementById(controlsId!)).toBeNull()

    await userEvent.click(detailsButton)
    expect(detailsButton).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(controlsId!)).toBeInTheDocument()
  })
})
