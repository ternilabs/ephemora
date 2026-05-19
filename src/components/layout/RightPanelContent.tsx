import { Box, SegmentedControl, Text, useMantineColorScheme } from '@mantine/core'
import type { ChatMessage } from '../../types/chat'
import { formatTime } from '../../utils/formatTime'

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export default function RightPanelContent(props: {
  secondsRemaining: number
  reportedMessages: ChatMessage[]
}) {
  const { secondsRemaining, reportedMessages } = props
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const appearanceValue = colorScheme === 'auto' ? 'system' : colorScheme

  return (
    <Box className="ep3-right-body">
      <Box className="ep3-info-section ep3-appearance-section">
        <Text className="ep3-info-label">Appearance</Text>
        <SegmentedControl
          className="ep3-appearance-control"
          aria-label="Appearance"
          fullWidth
          value={appearanceValue}
          onChange={(value) => {
            if (value === 'system') {
              setColorScheme('auto')
              return
            }
            if (value === 'light' || value === 'dark') {
              setColorScheme(value)
            }
          }}
          data={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
        />
      </Box>

      <Box className="ep3-info-section ep3-reset-section">
        <Text className="ep3-info-label">Next Reset</Text>
        <Box className="ep3-reset-block">
          <Text className="ep3-reset-time">{formatSeconds(secondsRemaining)}</Text>
          <Text className="ep3-reset-sub">Next global wipe at 00:00 UTC</Text>
        </Box>
      </Box>

      <Box className="ep3-reports-section">
        <Box className="ep3-info-label-row">
          <Text className="ep3-info-label">Room Under Review</Text>
          <Text className="ep3-count-pill">{reportedMessages.length} active</Text>
        </Box>

        <Box className="ep3-reports-scroll">
          {reportedMessages.length === 0 ? (
            <Text className="ep3-reported-empty">No active room-level review signals.</Text>
          ) : (
            reportedMessages.map((message) => (
              <Box key={message.id} className="ep3-reported-item">
                <Box className="ep3-reported-top">
                  <Text className="ep3-reported-nick">{message.nickname}</Text>
                  <Text className="ep3-reported-time">{formatTime(message.createdAt)}</Text>
                </Box>
                <Text className="ep3-reported-preview">
                  {message.moderationStatus === 'under_review'
                    ? 'This message has been flagged for review.'
                    : message.content}
                </Text>
                <Box className="ep3-reported-meta">
                  <Text className="ep3-reported-badge">Under review</Text>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  )
}
