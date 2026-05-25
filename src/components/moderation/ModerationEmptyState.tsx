import { Stack, Text } from '@mantine/core'
import type { LucideIcon } from 'lucide-react'

interface ModerationEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  hint: string
  safeTone?: boolean
}

export default function ModerationEmptyState(props: ModerationEmptyStateProps) {
  const Icon = props.icon

  return (
    <Stack
      className={`ep3-mod-empty-card ${props.safeTone ? 'ep3-mod-empty-card-safe' : ''}`.trim()}
      gap={8}
      py="md"
      role="status"
      aria-live="polite"
    >
      <Stack className="ep3-mod-empty-head" gap={0}>
        <Icon size={14} className="ep3-mod-empty-icon" aria-hidden="true" />
        <Text className="ep3-mod-empty-title">{props.title}</Text>
      </Stack>
      <Text className="ep3-mod-empty-copy">{props.description}</Text>
      <Text className="ep3-mod-empty-hint">{props.hint}</Text>
    </Stack>
  )
}
