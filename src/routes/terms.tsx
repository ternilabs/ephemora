import { createFileRoute } from '@tanstack/react-router'
import { Container, Stack, Text, Title } from '@mantine/core'
import ChatShell from '../components/layout/ChatShell'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [{ title: 'Terms | Ephemora' }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <ChatShell>
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Title order={2}>Terms</Title>
          <Text>Be respectful. Report harmful content. Moderation is automatic-first.</Text>
        </Stack>
      </Container>
    </ChatShell>
  )
}
