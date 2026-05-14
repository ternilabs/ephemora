import { createFileRoute } from '@tanstack/react-router'
import { Stack, Text, Title } from '@mantine/core'
import TwoPanelPageLayout from '../components/layout/TwoPanelPageLayout'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [{ title: 'About | Ephemora' }],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <TwoPanelPageLayout title="About">
      <Stack className="ep3-static-content" gap="lg">
        <Title order={2}>Ephemora</Title>
        <Text>
          Ephemora is a daily-reset global chatroom where every message is ephemeral and every
          nickname rotates.
        </Text>
        <Text>
          The product is designed for honest, low-pressure conversations without permanent social
          profiles.
        </Text>
      </Stack>
    </TwoPanelPageLayout>
  )
}
