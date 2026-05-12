import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useSession } from '../../hooks/useSession'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackRoute,
})

function AuthCallbackRoute() {
  const { data: session, isLoading } = useSession()

  if (!isLoading && session) {
    return <Navigate to="/" replace />
  }

  if (!isLoading) {
    return <Navigate to="/" replace />
  }

  return (
    <Center h="100dvh">
      <Stack align="center" gap="sm">
        <Loader />
        <Text c="dimmed" size="sm">
          Signing you in…
        </Text>
      </Stack>
    </Center>
  )
}
