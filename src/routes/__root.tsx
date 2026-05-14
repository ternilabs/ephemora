import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { Stack, Text, Title } from '@mantine/core'
import { homeLinkOptions } from './-navigation'

function RootLayout() {
  return (
    <>
      <HeadContent />
      <Outlet />
      <Scripts />
    </>
  )
}

function RootNotFound() {
  return (
    <main className="page">
      <Stack gap="sm">
        <Title order={2}>Page not found</Title>
        <Text>The page you requested does not exist.</Text>
        <Link {...homeLinkOptions}>Return to home</Link>
      </Stack>
    </main>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: RootNotFound,
})
