import { createFileRoute } from '@tanstack/react-router'
import { Center, Container, Loader, Stack, Text } from '@mantine/core'
import ChatShell from '../components/layout/ChatShell'
import MessageList from '../components/chat/MessageList'
import ResetCountdown from '../components/status/ResetCountdown'
import { useBootstrap } from '../hooks/useBootstrap'
import { useMessageHistory } from '../hooks/useMessageHistory'
import type { ChatMessage, MessageRow, ModerationStatus } from '../types/chat'

export const Route = createFileRoute('/')({
  component: ChatRoute,
})

function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    content: row.content,
    nickname: row.nickname,
    createdAt: row.created_at,
    moderationStatus: row.moderation_status,
  }
}

function dedupeById(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>()
  const out: ChatMessage[] = []
  for (const m of messages) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  return out
}

export default function ChatRoute() {
  const bootstrap = useBootstrap()
  const historyLimit = bootstrap.data?.limits.historyLimit ?? 50
  const history = useMessageHistory(historyLimit)
  const hiddenStatus: ModerationStatus = 'hidden'

  if (bootstrap.isLoading) {
    return (
      <Center h="100dvh">
        <Loader />
      </Center>
    )
  }

  const resetAt = bootstrap.data?.reset.resetAt

  const rows = history.data?.pages.flatMap((p) => p.messages) ?? []
  const mapped = rows.map(toChatMessage)

  const messages = dedupeById(mapped)
    .filter((m) => m.moderationStatus !== hiddenStatus)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <ChatShell
      headerStatus={<ResetCountdown resetAt={resetAt} />}
      headerRight={<div />}
    >
      {history.isLoading ? (
        <Container size="sm" py="xl">
          <Stack gap="sm">
            <Text>Loading messages…</Text>
          </Stack>
        </Container>
      ) : (
        <MessageList
          messages={messages}
          onLoadMore={() => {
            void history.fetchNextPage()
          }}
          hasMore={!!history.hasNextPage}
          loadingMore={history.isFetchingNextPage}
        />
      )}
    </ChatShell>
  )
}
