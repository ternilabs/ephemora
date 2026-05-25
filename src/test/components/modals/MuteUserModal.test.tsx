import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MantineProvider } from '@mantine/core'
import MuteUserModal from '@/components/modals/MuteUserModal'

describe('MuteUserModal', () => {
  it('caps effective duration to timeUntilReset at submit time', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const resetAt = new Date(Date.now() + 6 * 60000).toISOString()
    const user = userEvent.setup()

    render(
      <MantineProvider>
        <MuteUserModal
          nickname="target"
          resetAt={resetAt}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />
      </MantineProvider>,
    )

    await user.click(screen.getByRole('button', { name: /apply mute/i }))
    expect(onSubmit).toHaveBeenCalledWith({ durationMinutes: 5, reason: undefined })
  })

  it('blocks submit when timeUntilReset is zero or negative', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MantineProvider>
        <MuteUserModal
          nickname="target"
          resetAt={new Date(Date.now() - 60000).toISOString()}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />
      </MantineProvider>,
    )

    const submitButton = screen.getByRole('button', { name: /apply mute/i })
    expect(submitButton).toBeDisabled()
    await user.click(submitButton)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
