import { Text } from '@mantine/core'
import { useCountdown } from '../../hooks/useCountdown'

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export default function ResetCountdown(props: { resetAt?: string; onZero?: () => void }) {
  const { secondsRemaining } = useCountdown({ resetAt: props.resetAt, onZero: props.onZero })
  return (
    <Text size="sm" c="dimmed">
      Reset in {formatSeconds(secondsRemaining)}
    </Text>
  )
}
