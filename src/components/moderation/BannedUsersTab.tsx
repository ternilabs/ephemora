import { Stack, Text } from '@mantine/core'
import { useBannedUsers } from '../../hooks/useBannedUsers'
import { useModerationActions } from '../../hooks/useModerationActions'
import ModerationUserRow from './ModerationUserRow'

export default function BannedUsersTab(props: { enabled: boolean }) {
  const banned = useBannedUsers(props.enabled)
  const actions = useModerationActions()
  const unbanPending = actions.unbanUser.isPending

  if (banned.isLoading) return <Text>Loading…</Text>
  if (banned.isError) return <Text>Failed to load.</Text>

  return (
    <Stack gap="sm" py="md">
      {(banned.data ?? []).map((user) => (
        <ModerationUserRow
          key={user.id}
          user={user}
          onUnban={() => actions.unbanUser.mutate(user.id)}
          unbanLoading={unbanPending}
          unbanDisabled={unbanPending}
        />
      ))}
    </Stack>
  )
}
