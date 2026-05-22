import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { Stack, Text, Title } from '@mantine/core'
import { FileQuestion } from 'lucide-react'
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
    <main className="page ep3-notfound-page">
      <Stack gap="sm" align="center" className="ep3-notfound-card">
        <FileQuestion className="ep3-notfound-icon" size={26} strokeWidth={1.8} />
        <Title order={2}>Page not found</Title>
        <Text c="dimmed">The page you requested does not exist.</Text>
        <Link {...homeLinkOptions} className="ep3-notfound-link">
          Return to home
        </Link>
      </Stack>
    </main>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: RootNotFound,
})
