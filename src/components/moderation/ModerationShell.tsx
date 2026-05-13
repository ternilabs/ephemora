import type { ReactNode } from 'react'
import { Container, Stack, Title } from '@mantine/core'

export default function ModerationShell(props: { children: ReactNode }) {
  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Title order={2}>Moderation</Title>
        {props.children}
      </Stack>
    </Container>
  )
}
