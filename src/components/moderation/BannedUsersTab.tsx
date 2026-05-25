import { Loader, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useState } from 'react'
import { Ban, Search } from 'lucide-react'
import { useBannedUsersSearch } from '../../hooks/useBannedUsersSearch'
import { useModerationActions } from '../../hooks/useModerationActions'
import ModerationEmptyState from './ModerationEmptyState'
import ModerationUserRow from './ModerationUserRow'

export default function BannedUsersTab(props: { enabled: boolean }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 150)
  const banned = useBannedUsersSearch(props.enabled, debouncedSearch)
  const actions = useModerationActions()
  const unbanPending = actions.unbanUser.isPending
  const isInitialLoad = banned.isPending && !banned.data

  if (isInitialLoad) {
    return (
      <Stack className="ep3-mod-panel-loading" gap={10} align="center" justify="center">
        <Loader size={20} />
        <Text className="ep3-mod-state">Loading banned users…</Text>
      </Stack>
    )
  }
  if (banned.isError) return <Text className="ep3-mod-state">Failed to load banned users.</Text>
  const items = banned.data ?? []

  return (
    <Stack gap="sm" py="md" className="ep3-mod-list">
      <TextInput
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder="Search by UUID"
        aria-label="Search banned users by UUID"
        classNames={{ input: 'ep3-mod-search-input' }}
        leftSection={<Search size={14} />}
        rightSection={banned.isFetching ? <Loader size={12} /> : undefined}
      />

      {items.length === 0 ? (
        <ModerationEmptyState
          icon={Ban}
          title={search.trim().length > 0 ? 'No match found' : 'No active bans'}
          description={
            search.trim().length > 0
              ? 'No banned user matched the UUID query.'
              : 'There are currently no banned users in this room.'
          }
          hint={
            search.trim().length > 0
              ? 'Try a longer UUID fragment or clear search.'
              : 'Use UUID search here once bans are created.'
          }
        />
      ) : (
        items.map((user) => (
          <ModerationUserRow
            key={user.id}
            user={user}
            onUnban={() =>
              actions.unbanUser.mutate({
                supabaseUserId: user.supabase_user_id,
                fallbackRecordId: user.id,
              })
            }
            unbanLoading={unbanPending}
            unbanDisabled={unbanPending}
          />
        ))
      )}
    </Stack>
  )
}
