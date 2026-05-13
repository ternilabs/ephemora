import { Tabs, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import AiActionsTab from '../components/moderation/AiActionsTab'
import BannedUsersTab from '../components/moderation/BannedUsersTab'
import ModerationShell from '../components/moderation/ModerationShell'
import ReviewQueueTab from '../components/moderation/ReviewQueueTab'
import { useModerator } from '../hooks/useModerator'

export const Route = createFileRoute('/moderation')({
  component: ModerationRoute,
})

type ModerationTab = 'review' | 'ai' | 'banned'

function ModerationRoute() {
  const { isModerator, isLoading } = useModerator()
  const [activeTab, setActiveTab] = useState<ModerationTab>('review')

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
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab((value as ModerationTab | null) ?? 'review')}
      >
        <Tabs.List>
          <Tabs.Tab value="review">Review Queue</Tabs.Tab>
          <Tabs.Tab value="ai">AI Actions</Tabs.Tab>
          <Tabs.Tab value="banned">Banned Users</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="review">
          <ReviewQueueTab enabled={activeTab === 'review'} />
        </Tabs.Panel>
        <Tabs.Panel value="ai">
          <AiActionsTab enabled={activeTab === 'ai'} />
        </Tabs.Panel>
        <Tabs.Panel value="banned">
          <BannedUsersTab enabled={activeTab === 'banned'} />
        </Tabs.Panel>
      </Tabs>
    </ModerationShell>
  )
}
