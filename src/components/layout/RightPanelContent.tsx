import { Box, SegmentedControl, Text, UnstyledButton, useMantineColorScheme } from '@mantine/core'

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export default function RightPanelContent(props: {
  secondsRemaining: number
  isAuthed?: boolean
  nickname?: string | null
  nicknameLoading?: boolean
  showModerationAction?: boolean
  onModeration?: () => void
  onSignOut?: () => void
}) {
  const { secondsRemaining } = props
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

      {props.isAuthed ? (
        <Box className="ep3-info-section ep3-account-section">
          <Text className="ep3-info-label">Session</Text>
          <Text className="ep3-session-name">
            You are{' '}
            <strong>{props.nicknameLoading ? 'Loading…' : (props.nickname ?? 'Anonymous')}</strong>
          </Text>
          <Box className="ep3-session-actions">
            {props.showModerationAction ? (
              <UnstyledButton className="ep3-session-action ep3-session-action-mod" onClick={props.onModeration}>
                Moderation
              </UnstyledButton>
            ) : null}
            {props.onSignOut ? (
              <UnstyledButton className="ep3-session-action ep3-session-action-signout" onClick={props.onSignOut}>
                Sign out
              </UnstyledButton>
            ) : null}
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}
