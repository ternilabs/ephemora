import { Tabs, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import AiActionsTab from '../components/moderation/AiActionsTab'
import BannedUsersTab from '../components/moderation/BannedUsersTab'
import ModerationShell from '../components/moderation/ModerationShell'
import ReviewQueueTab from '../components/moderation/ReviewQueueTab'
import { useModerator } from '../hooks/useModerator'

export const Route = createFileRoute('/moderation')({
  component: ModerationRoute,
})

function ModerationRoute() {
  const { isModerator, isLoading } = useModerator()

  if (isLoading) {
    return (
      <ModerationShell>
        <Text>Checking access…</Text>
      </ModerationShell>
    )
  }

  if (!isModerator) {
    return (
      <ModerationShell>
        <Text>403 — Moderator access required.</Text>
      </ModerationShell>
    )
  }

  return (
    <ModerationShell>
      <Tabs defaultValue="review">
        <Tabs.List>
          <Tabs.Tab value="review">Review Queue</Tabs.Tab>
          <Tabs.Tab value="ai">AI Actions</Tabs.Tab>
          <Tabs.Tab value="banned">Banned Users</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="review">
          <ReviewQueueTab enabled={true} />
        </Tabs.Panel>
        <Tabs.Panel value="ai">
          <AiActionsTab enabled={true} />
        </Tabs.Panel>
        <Tabs.Panel value="banned">
          <BannedUsersTab enabled={true} />
        </Tabs.Panel>
      </Tabs>
    </ModerationShell>
  )
}
