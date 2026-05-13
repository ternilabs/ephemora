import { Button, Group, Stack, Text, Textarea } from '@mantine/core'
import { useState } from 'react'

export default function ReportMessageModal(props: {
  contentPreview: string
  onCancel: () => void
  onSubmit: (reason?: string) => void
  submitting?: boolean
}) {
  const [reason, setReason] = useState('')

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
        <Button variant="default" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button loading={props.submitting ?? false} onClick={() => props.onSubmit(reason.trim() || undefined)}>
          Submit report
        </Button>
      </Group>
    </Stack>
  )
}
