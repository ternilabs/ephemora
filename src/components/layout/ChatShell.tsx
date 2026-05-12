import type { ReactNode } from 'react'
import { AppShell, Group, Title } from '@mantine/core'
import Footer from './Footer'

export default function ChatShell(props: {
  headerRight: ReactNode
  headerStatus: ReactNode
  children: ReactNode
}) {
  return (
    <AppShell header={{ height: 56 }} footer={{ height: 44 }} padding={0}>
      <AppShell.Header>
        <Group justify="space-between" h="100%" px="md">
          <Title order={4}>Ephemora</Title>
          <Group gap="md">{props.headerStatus}</Group>
          {props.headerRight}
        </Group>
      </AppShell.Header>

      <AppShell.Main>{props.children}</AppShell.Main>

      <AppShell.Footer>
        <Footer />
      </AppShell.Footer>
    </AppShell>
  )
}
