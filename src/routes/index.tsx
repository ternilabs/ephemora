import { createFileRoute } from '@tanstack/react-router'
import { Container, Stack, Text } from '@mantine/core'
import ChatShell from '../components/layout/ChatShell'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <ChatShell headerRight={<div />} headerStatus={<div />}>
      <Container size="sm" py="xl">
        <Stack gap="sm">
          <Text fw={700} size="xl">
            Say it today. Let it fade tomorrow.
          </Text>
          <Text c="dimmed">
            Phase 2 will implement visitor read + infinite scroll via HTTP.
          </Text>
        </Stack>
      </Container>
    </ChatShell>
  )
}
