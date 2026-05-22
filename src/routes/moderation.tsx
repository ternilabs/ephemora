import { Button, Drawer, Group, Loader, Stack, Tabs, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, ShieldX } from 'lucide-react'
import { type ComponentType, type ReactNode, useState } from 'react'
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

function ModerationState(props: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
  action?: ReactNode
}) {
  const Icon = props.icon
  return (
    <Stack className="ep3-mod-center-state" gap={10} align="center" role="status" aria-live="polite">
      <Icon size={28} className="ep3-mod-center-icon" />
      <Text className="ep3-mod-center-title">{props.title}</Text>
      <Text className="ep3-mod-center-description">{props.description}</Text>
      {props.action ? <Stack gap={0}>{props.action}</Stack> : null}
    </Stack>
  )
}

function ModerationRoute() {
  const { isModerator, isLoading, isUnauthorized, isForbidden, isLoadFailed, isRetrying, retry } = useModerator()
  const [activeTab, setActiveTab] = useState<ModerationTab>('review')
  const [aiLogsOpened, setAiLogsOpened] = useState(false)
  const useTabbedLayout = useMediaQuery('(max-width: 1200px)', false)

  if (isLoading) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <Stack className="ep3-mod-center-state" gap={10} align="center" role="status" aria-live="polite">
          <Loader size={28} type="dots" className="ep3-mod-center-icon" />
          <Text className="ep3-mod-center-title">Checking access</Text>
          <Text className="ep3-mod-center-description">Verifying moderator permissions.</Text>
        </Stack>
      </TwoPanelPageLayout>
    )
  }

  if (isUnauthorized) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <ModerationState
          icon={AlertTriangle}
          title="Sign in required"
          description="Your session is missing or expired. Sign in again to continue."
        />
      </TwoPanelPageLayout>
    )
  }

  if (isLoadFailed) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <ModerationState
          icon={AlertTriangle}
          title="Unable to verify access"
          description="We couldn't validate moderation permissions right now."
          action={
            <Button
              variant="subtle"
              className="ep3-mod-action ep3-mod-action-neutral"
              onClick={() => retry()}
              loading={isRetrying}
              disabled={isRetrying}
            >
              Retry
            </Button>
          }
        />
      </TwoPanelPageLayout>
    )
  }

  if (isForbidden || !isModerator) {
    return (
      <TwoPanelPageLayout title="Moderation">
        <ModerationState
          icon={ShieldX}
          title="Access restricted"
          description="Moderator role is required to open this workspace."
        />
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
