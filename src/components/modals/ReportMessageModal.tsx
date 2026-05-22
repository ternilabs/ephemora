import { Button, Group, Stack, Text, Textarea } from '@mantine/core'
import { useState } from 'react'

export default function ReportMessageModal(props: {
  contentPreview: string
  onCancel: () => void
  onSubmit: (reason?: string) => void | Promise<void>
  onSubmittingChange?: (isSubmitting: boolean) => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (submitting) {
      return
    }

    setSubmitting(true)
    props.onSubmittingChange?.(true)
    try {
      await props.onSubmit(reason.trim() || undefined)
    } finally {
      setSubmitting(false)
      props.onSubmittingChange?.(false)
    }
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Reporting:
      </Text>
      <Text size="sm">{props.contentPreview}</Text>

      <Textarea
        label="Reason (optional)"
        value={reason}
        onChange={(event) => setReason(event.currentTarget.value)}
        autosize
        minRows={2}
      />

      <Group justify="flex-end">
        <Button variant="default" onClick={props.onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button loading={submitting} disabled={submitting} onClick={() => void submit()}>
          Submit report
        </Button>
      </Group>
    </Stack>
  )
}
