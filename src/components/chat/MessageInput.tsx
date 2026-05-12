import { Button, Group, Progress, Stack, Text, Textarea } from '@mantine/core'
import { useMemo, useState } from 'react'

export default function MessageInput(props: {
  maxLength: number
  cooldownWindowMs: number
  cooldownRemainingMs: number
  muteRemainingMs: number
  onSend: (content: string) => void
}) {
  const [value, setValue] = useState('')

  const len = value.length
  const trimmedValue = value.trim()
  const overLimit = len > props.maxLength
  const empty = trimmedValue.length === 0
  const muted = props.muteRemainingMs > 0
  const coolingDown = props.cooldownRemainingMs > 0

  const charColor = len > props.maxLength * 0.8 ? 'red' : 'dimmed'

  const cooldownProgress = useMemo(() => {
    if (!coolingDown) return 0
    if (props.cooldownWindowMs <= 0) return 0
    return Math.max(0, Math.min(100, (props.cooldownRemainingMs / props.cooldownWindowMs) * 100))
  }, [coolingDown, props.cooldownRemainingMs, props.cooldownWindowMs])

  const disabled = muted || coolingDown || empty || overLimit

  return (
    <Stack gap={6} px="md" py="sm">
      {muted ? (
        <Text size="sm" c="red">
          Muted ({Math.ceil(props.muteRemainingMs / 1000)}s remaining)
        </Text>
      ) : null}
      {coolingDown ? <Progress value={cooldownProgress} /> : null}

      <Textarea
        placeholder="Say it today…"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        minRows={2}
        autosize
      />

      <Group justify="space-between">
        <Text size="sm" c={charColor}>
          {len} / {props.maxLength}
        </Text>
        <Button
          disabled={disabled}
          onClick={() => {
            if (!trimmedValue) return
            props.onSend(trimmedValue)
            setValue('')
          }}
        >
          Send
        </Button>
      </Group>
    </Stack>
  )
}
