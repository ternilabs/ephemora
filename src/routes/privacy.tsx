import { createFileRoute } from '@tanstack/react-router'
import { Container, Stack, Text, Title } from '@mantine/core'
import ChatShell from '../components/layout/ChatShell'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [{ title: 'Privacy | Ephemora' }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <ChatShell>
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Title order={2}>Privacy</Title>
          <Text>
            Stage 1: no persistent public profile. Messages are physically deleted at the daily
            reset (00:00 UTC).
          </Text>
        </Stack>
      </Container>
    </ChatShell>
  )
}
