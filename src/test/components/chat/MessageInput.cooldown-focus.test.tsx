import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MessageInput from '@/components/chat/MessageInput'

describe('MessageInput cooldown focus behavior', () => {
  it('focuses textarea when cooldown transitions to ready', async () => {
    const onSend = vi.fn()
    const { rerender } = render(
      <MantineProvider>
        <MessageInput
          maxLength={500}
          cooldownWindowMs={5000}
          cooldownRemainingMs={2000}
          muteRemainingMs={0}
          mentionUsers={[]}
          onSend={onSend}
        />
      </MantineProvider>,
    )

    const textarea = screen.getByPlaceholderText('Write something ephemeral...')
    expect(textarea).not.toHaveFocus()

    rerender(
      <MantineProvider>
        <MessageInput
          maxLength={500}
          cooldownWindowMs={5000}
          cooldownRemainingMs={0}
          muteRemainingMs={0}
          mentionUsers={[]}
          onSend={onSend}
        />
      </MantineProvider>,
    )

    await waitFor(() => {
      expect(textarea).toHaveFocus()
    })
  })

  it('does not steal focus from another interactive element when cooldown ends', async () => {
    const onSend = vi.fn()
    const { rerender } = render(
      <MantineProvider>
        <button type="button">External action</button>
        <MessageInput
          maxLength={500}
          cooldownWindowMs={5000}
          cooldownRemainingMs={2000}
          muteRemainingMs={0}
          mentionUsers={[]}
          onSend={onSend}
        />
      </MantineProvider>,
    )

    const externalButton = screen.getByRole('button', { name: 'External action' })
    externalButton.focus()
    expect(externalButton).toHaveFocus()

    rerender(
      <MantineProvider>
        <button type="button">External action</button>
        <MessageInput
          maxLength={500}
          cooldownWindowMs={5000}
          cooldownRemainingMs={0}
          muteRemainingMs={0}
          mentionUsers={[]}
          onSend={onSend}
        />
      </MantineProvider>,
    )

    await waitFor(() => {
      expect(externalButton).toHaveFocus()
    })
  })
})
