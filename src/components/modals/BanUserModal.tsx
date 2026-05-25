import { Button, Group, Stack, Text, Textarea } from '@mantine/core'
import { useState } from 'react'

export default function BanUserModal(props: {
  nickname: string
  onCancel: () => void
  onSubmit: (args: { reason?: string }) => void | Promise<void>
  onSubmittingChange?: (isSubmitting: boolean) => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    props.onSubmittingChange?.(true)
    try {
      await props.onSubmit({ reason: reason.trim() || undefined })
    } finally {
      setSubmitting(false)
      props.onSubmittingChange?.(false)
    }
  }

  return (
    <Stack gap="sm">
      <Text size="sm">Ban {props.nickname} until next reset?</Text>
      <Textarea
        label="Reason (optional)"
        value={reason}
        onChange={(event) => setReason(event.currentTarget.value)}
        minRows={2}
        disabled={submitting}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={props.onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button color="red" loading={submitting} disabled={submitting} onClick={() => void submit()}>
          Confirm ban
        </Button>
      </Group>
    </Stack>
  )
}
