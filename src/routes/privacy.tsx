import { createFileRoute } from '@tanstack/react-router'
import { Stack, Text, Title } from '@mantine/core'
import TwoPanelPageLayout from '../components/layout/TwoPanelPageLayout'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [{ title: 'Privacy | Ephemora' }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <TwoPanelPageLayout title="Privacy">
      <Stack className="ep3-static-content" gap="lg">
        <Title order={2}>Privacy</Title>
        <Text>
          Ephemora does not expose a persistent public profile. Messages are purged at the daily
          reset (00:00 UTC).
        </Text>
        <Text>
          OAuth is used only for session authentication and moderation integrity. Public identity
          remains nickname-based.
        </Text>
      </Stack>
    </TwoPanelPageLayout>
  )
}
