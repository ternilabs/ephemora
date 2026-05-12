import { Badge } from '@mantine/core'
import type { SocketStatus } from '../../hooks/useSocket'

export default function ConnectionStatus(props: { status: SocketStatus }) {
  if (props.status === 'connected') return <Badge color="green">Connected</Badge>
  if (props.status === 'waking') return <Badge color="yellow">Waking up…</Badge>
  if (props.status === 'unavailable') return <Badge color="red">Unavailable</Badge>
  if (props.status === 'connecting') return <Badge color="yellow">Connecting…</Badge>
  return <Badge color="gray">Offline</Badge>
}
