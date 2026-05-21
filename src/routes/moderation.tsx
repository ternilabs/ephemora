import { Button, Drawer, Group, Stack, Tabs, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
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
  const [aiLogsOpened, setAiLogsOpened] = useState(false)
  const useTabbedLayout = useMediaQuery('(max-width: 1200px)', false)

  if (isLoading) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Text className="ep3-mod-state">Checking moderation access…</Text>
      </TwoPanelPageLayout>
    )
  }

  if (isUnauthorized) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Text className="ep3-mod-state">401 — Sign in required. Please sign in again.</Text>
      </TwoPanelPageLayout>
    )
  }

  if (isForbidden) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Text className="ep3-mod-state">403 — Moderator access required.</Text>
      </TwoPanelPageLayout>
    )
  }

  if (isLoadFailed) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Stack gap={6}>
          <Text className="ep3-mod-state">Failed to verify moderation access.</Text>
          <Button
            variant="subtle"
            className="ep3-mod-action ep3-mod-action-neutral"
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
        <Text className="ep3-mod-state">Failed to verify moderation access.</Text>
      </TwoPanelPageLayout>
    )
  }

  return (
    <TwoPanelPageLayout title="Moderation">
      {useTabbedLayout ? (
        <Tabs
          className="ep3-moderation-tabs ep3-mod-shell"
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
      ) : (
        <>
          <Stack className="ep3-mod-shell ep3-mod-grid" gap={0}>
            <Stack className="ep3-mod-review-pane" gap={0}>
              <Group className="ep3-mod-review-header" justify="space-between" align="center">
                <Text className="ep3-mod-col-title">Review Queue</Text>
                <Button
                  variant="subtle"
                  size="xs"
                  className="ep3-mod-action ep3-mod-action-neutral"
                  onClick={() => setAiLogsOpened(true)}
                >
                  AI Logs
                </Button>
              </Group>
              <ReviewQueueTab enabled />
            </Stack>
            <Stack className="ep3-mod-col" gap={0}>
              <Text className="ep3-mod-col-title">Banned Users</Text>
              <BannedUsersTab enabled />
            </Stack>
          </Stack>
          <Drawer
            opened={aiLogsOpened}
            onClose={() => setAiLogsOpened(false)}
            title="AI Logs"
            position="right"
            size="clamp(480px, 42vw, 820px)"
            classNames={{
              inner: 'ep3-mod-drawer-inner',
              content: 'ep3-mod-drawer-content',
              header: 'ep3-mod-drawer-header',
              body: 'ep3-mod-drawer-body',
            }}
          >
            <AiActionsTab enabled={aiLogsOpened} />
          </Drawer>
        </>
      )}
    </TwoPanelPageLayout>
  )
}
