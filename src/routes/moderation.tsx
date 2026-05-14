import { Button, Stack, Tabs, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import AiActionsTab from '../components/moderation/AiActionsTab'
import BannedUsersTab from '../components/moderation/BannedUsersTab'
import TwoPanelPageLayout from '../components/layout/TwoPanelPageLayout'
import ReviewQueueTab from '../components/moderation/ReviewQueueTab'
import { useModerator } from '../hooks/useModerator'

export const Route = createFileRoute('/moderation')({
  head: () => ({
    meta: [{ title: 'Moderation | Ephemora' }],
  }),
  component: ModerationRoute,
})

type ModerationTab = 'review' | 'ai' | 'banned'

function ModerationRoute() {
  const { isModerator, isLoading, isUnauthorized, isForbidden, isLoadFailed, isRetrying, retry } = useModerator()
  const [activeTab, setActiveTab] = useState<ModerationTab>('review')

  if (isLoading) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Text>Checking access…</Text>
      </TwoPanelPageLayout>
    )
  }

  if (isUnauthorized) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Text>401 — Sign in required. Please sign in again.</Text>
      </TwoPanelPageLayout>
    )
  }

  if (isForbidden) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Text>403 — Moderator access required.</Text>
      </TwoPanelPageLayout>
    )
  }

  if (isLoadFailed) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Stack gap="sm">
          <Text>Failed to verify moderation access.</Text>
          <Button
            variant="light"
            onClick={() => retry()}
            loading={isRetrying}
            disabled={isRetrying}
          >
            Retry
          </Button>
        </Stack>
      </TwoPanelPageLayout>
    )
  }

  if (!isModerator) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Text>Failed to verify moderation access.</Text>
      </TwoPanelPageLayout>
    )
  }

  return (
    <TwoPanelPageLayout title="Moderation">
      <Tabs
        className="ep3-moderation-tabs"
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
    </TwoPanelPageLayout>
  )
}
