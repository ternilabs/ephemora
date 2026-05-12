import { createFileRoute } from '@tanstack/react-router'
import { Container, Stack, Text, Title } from '@mantine/core'
import ChatShell from '../components/layout/ChatShell'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [{ title: 'About | Ephemora' }],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <ChatShell>
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Title order={2}>About</Title>
          <Text>
            Ephemora is a daily-reset global chatroom where messages disappear and nicknames change
            every day.
          </Text>
        </Stack>
      </Container>
    </ChatShell>
  )
}
