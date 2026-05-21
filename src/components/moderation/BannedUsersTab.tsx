import { Stack, Text } from '@mantine/core'
import { useBannedUsers } from '../../hooks/useBannedUsers'
import { useModerationActions } from '../../hooks/useModerationActions'
import ModerationUserRow from './ModerationUserRow'

export default function BannedUsersTab(props: { enabled: boolean }) {
  const banned = useBannedUsers(props.enabled)
  const actions = useModerationActions()
  const unbanPending = actions.unbanUser.isPending

  if (banned.isLoading) return <Text className="ep3-mod-state">Loading banned users…</Text>
  if (banned.isError) return <Text className="ep3-mod-state">Failed to load banned users.</Text>
  if (!banned.data || banned.data.length === 0) {
    return <Text className="ep3-mod-state" py="md">No banned users.</Text>
  }

  return (
    <Stack gap="sm" py="md" className="ep3-mod-list">
      {banned.data.map((user) => (
        <ModerationUserRow
          key={user.id}
          user={user}
          onUnban={() => actions.unbanUser.mutate(user.supabase_user_id)}
          unbanLoading={unbanPending}
          unbanDisabled={unbanPending}
        />
      ))}
    </Stack>
  )
}
