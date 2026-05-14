import { createFileRoute } from '@tanstack/react-router'
import { Stack, Text, Title } from '@mantine/core'
import TwoPanelPageLayout from '../components/layout/TwoPanelPageLayout'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [{ title: 'Terms | Ephemora' }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <TwoPanelPageLayout title="Terms">
      <Stack className="ep3-static-content" gap="lg">
        <Title order={2}>Terms</Title>
        <Text>Be respectful. Harassment, hate speech, and targeted abuse are not allowed.</Text>
        <Text>
          Use reporting tools when content crosses policy boundaries. Moderation is automated-first
          with human escalation.
        </Text>
      </Stack>
    </TwoPanelPageLayout>
  )
}
