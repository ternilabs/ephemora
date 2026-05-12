import { Button, Group, Text } from '@mantine/core'

export default function UserBadge(props: { nickname?: string | null; onSignOut: () => void }) {
  return (
    <Group gap="xs">
      <Text size="sm">{props.nickname ?? '…'}</Text>
      <Button variant="default" onClick={props.onSignOut}>
        Logout
      </Button>
    </Group>
  )
}
