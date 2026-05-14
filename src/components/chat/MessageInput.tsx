import { Box, Button, Group, Stack, Text, Textarea } from '@mantine/core'
import { useMemo, useState } from 'react'

export default function MessageInput(props: {
  maxLength: number
  cooldownWindowMs: number
  cooldownRemainingMs: number
  muteRemainingMs: number
  nickname?: string | null
  sendDisabled?: boolean
  showModeratorAction?: boolean
  onModerator?: () => void
  onSignOut?: () => void
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

  const disabled = !!props.sendDisabled || muted || coolingDown || empty || overLimit

  return (
    <Stack gap={8} className="ep3-compose">
      <Text className="ep3-compose-label">
        You are <strong>{props.nickname ?? 'Anonymous'}</strong>
      </Text>
      {muted ? (
        <Text className="ep3-compose-muted">
          Muted ({Math.ceil(props.muteRemainingMs / 1000)}s remaining)
        </Text>
      ) : null}

      <Group gap={8} wrap="nowrap" align="flex-end">
        <Textarea
          className="ep3-compose-input"
          placeholder="Write something ephemeral..."
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          minRows={1}
          maxRows={4}
          autosize
        />
        <Button
          className="ep3-send-btn"
          aria-label="Send message"
          disabled={disabled}
          onClick={() => {
            if (!trimmedValue) return
            props.onSend(trimmedValue)
            setValue('')
          }}
        >
          →
        </Button>
      </Group>

      <Group justify="space-between" align="center">
        <Group gap={10} wrap="nowrap" className="ep3-compose-meta-left">
          <Text className="ep3-char-count" c={charColor}>
            {len} / {props.maxLength}
          </Text>
          <Box className="ep3-cooldown-wrap">
            <Box className="ep3-cooldown-fill" style={{ width: coolingDown ? `${cooldownProgress}%` : '0%' }} />
          </Box>
        </Group>

        <Group gap={8} wrap="nowrap" className="ep3-compose-actions">
          {props.showModeratorAction ? (
            <Button className="ep3-compose-action ep3-compose-action-mod" size="compact-xs" onClick={props.onModerator}>
              Moderator
            </Button>
          ) : null}
          {props.onSignOut ? (
            <Button
              className="ep3-compose-action ep3-compose-action-signout"
              variant="default"
              size="compact-xs"
              onClick={props.onSignOut}
            >
              Sign out
            </Button>
          ) : null}
        </Group>
      </Group>
    </Stack>
  )
}
