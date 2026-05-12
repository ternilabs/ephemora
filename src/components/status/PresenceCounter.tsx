import { Text } from '@mantine/core'

export default function PresenceCounter(props: { count: number }) {
  const label = props.count === 1 ? 'person' : 'people'

  return (
    <Text size="sm" c="dimmed">
      {props.count} {label} here
    </Text>
  )
}
