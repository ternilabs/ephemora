import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { describe, expect, it, vi } from 'vitest'
import BannedUsersTab from '@/components/moderation/BannedUsersTab'

vi.mock('@/hooks/useBannedUsersSearch', () => ({
  useBannedUsersSearch: () => ({
    isLoading: false,
    isError: false,
    data: [
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
    ],
  }),
}))

vi.mock('@/hooks/useModerationActions', () => ({
  useModerationActions: () => ({
    unbanUser: { isPending: false, mutate: vi.fn() },
  }),
}))

describe('BannedUsersTab search', () => {
  it('shows search input for banned-user uuid query', async () => {
    const client = new QueryClient()
    render(
      <MantineProvider>
        <QueryClientProvider client={client}>
          <BannedUsersTab enabled />
        </QueryClientProvider>
      </MantineProvider>,
    )

    expect(screen.getByPlaceholderText(/search by uuid/i)).toBeInTheDocument()

    const input = screen.getByPlaceholderText(/search by uuid/i)
    await userEvent.type(input, 'af52')
    expect(input).toHaveValue('af52')
  })
})
