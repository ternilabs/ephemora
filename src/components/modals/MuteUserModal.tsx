import { Alert, Button, Group, Select, Stack, Text, Textarea } from '@mantine/core'
import { useMemo, useState } from 'react'

const DURATION_OPTIONS = [
  { value: '10', label: '10 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '300', label: '5 hours' },
]

function getTimeUntilResetMinutes(resetAt?: string, nowMs = Date.now()): number {
  if (!resetAt) return 0
  const resetAtMs = new Date(resetAt).getTime()
  if (Number.isNaN(resetAtMs)) return 0
  return Math.max(0, Math.floor((resetAtMs - nowMs) / 60000))
}

export default function MuteUserModal(props: {
  nickname: string
  resetAt?: string
  onCancel: () => void
  onSubmit: (args: { durationMinutes: number; reason?: string }) => void | Promise<void>
  onSubmittingChange?: (isSubmitting: boolean) => void
}) {
  const [selectedDuration, setSelectedDuration] = useState('10')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const timeUntilResetMinutes = getTimeUntilResetMinutes(props.resetAt)
  const selectedDurationMinutes = Number(selectedDuration)
  const effectiveDurationMinutes = Math.min(selectedDurationMinutes, timeUntilResetMinutes)
  const blocked = timeUntilResetMinutes <= 0

  const helperText = useMemo(() => {
    if (blocked) return 'Mute unavailable: reset window has ended.'
    if (effectiveDurationMinutes < selectedDurationMinutes) {
      return `Duration capped to ${effectiveDurationMinutes} minutes until next reset.`
    }
    return `Applies for ${effectiveDurationMinutes} minutes.`
  }, [blocked, effectiveDurationMinutes, selectedDurationMinutes])

  const submit = async () => {
    if (submitting || blocked) return

    const latestTimeUntilResetMinutes = getTimeUntilResetMinutes(props.resetAt)
    if (latestTimeUntilResetMinutes <= 0) {
      return
    }

    const latestEffectiveDurationMinutes = Math.min(selectedDurationMinutes, latestTimeUntilResetMinutes)

    setSubmitting(true)
    props.onSubmittingChange?.(true)
    try {
      await props.onSubmit({
        durationMinutes: latestEffectiveDurationMinutes,
        reason: reason.trim() || undefined,
      })
    } finally {
      setSubmitting(false)
      props.onSubmittingChange?.(false)
    }
  }

  return (
    <Stack gap="sm">
      <Text size="sm">Mute {props.nickname} until next reset.</Text>
      <Select
        label="Duration"
        data={DURATION_OPTIONS}
        value={selectedDuration}
        onChange={(value) => setSelectedDuration(value ?? '10')}
        allowDeselect={false}
        disabled={submitting}
      />
      <Textarea
        label="Reason (optional)"
        value={reason}
        onChange={(event) => setReason(event.currentTarget.value)}
        minRows={2}
        disabled={submitting}
      />
      <Alert color={blocked ? 'red' : 'blue'}>{helperText}</Alert>
      <Group justify="flex-end">
        <Button variant="default" onClick={props.onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button loading={submitting} disabled={blocked || submitting} onClick={() => void submit()}>
          Apply mute
        </Button>
      </Group>
    </Stack>
  )
}
