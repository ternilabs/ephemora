import { Anchor, Group, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

export default function Footer() {
  return (
    <Group justify="space-between" px="md" py="xs">
      <Text size="sm" c="dimmed">
        Ephemora
      </Text>
      <Group gap="md">
        <Anchor component={Link} to="/about" size="sm">
          About
        </Anchor>
        <Anchor component={Link} to="/privacy" size="sm">
          Privacy
        </Anchor>
        <Anchor component={Link} to="/terms" size="sm">
          Terms
        </Anchor>
      </Group>
    </Group>
  )
}
