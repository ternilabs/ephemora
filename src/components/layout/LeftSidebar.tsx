import { Anchor, Box, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import clsx from 'clsx'

export default function LeftSidebar(props: {
  presenceCount?: number | null
  showPresence?: boolean
  className?: string
}) {
  const hasPresence = typeof props.presenceCount === 'number'
  const shouldShowPresence = props.showPresence ?? false
  const presenceLabel = hasPresence ? `${props.presenceCount} online` : 'online'
  const className = clsx('ep3-left', props.className)

  return (
    <Box className={className}>
      <Text className="ep3-topics-label">Topics</Text>
      <Box className="ep3-topic-row ep3-topic-row-active">
        <Box className="ep3-topic-icon">◎</Box>
        <Box className="ep3-topic-meta">
          <Text className="ep3-topic-name">Global</Text>
          <Text className="ep3-topic-desc">Official global server</Text>
        </Box>
        {shouldShowPresence ? <Text className="ep3-topic-online">{presenceLabel}</Text> : null}
      </Box>

      <Box className="ep3-topic-skel-row" aria-hidden>
        <Box className="ep3-topic-skel-icon" />
        <Box className="ep3-topic-skel-lines">
          <Box className="ep3-topic-skel ep3-topic-skel-w-70" />
          <Box className="ep3-topic-skel ep3-topic-skel-w-50" />
        </Box>
      </Box>
      <Box className="ep3-topic-skel-row" aria-hidden>
        <Box className="ep3-topic-skel-icon" />
        <Box className="ep3-topic-skel-lines">
          <Box className="ep3-topic-skel ep3-topic-skel-w-55" />
          <Box className="ep3-topic-skel ep3-topic-skel-w-40" />
        </Box>
      </Box>
      <Box className="ep3-topic-skel-row" aria-hidden>
        <Box className="ep3-topic-skel-icon" />
        <Box className="ep3-topic-skel-lines">
          <Box className="ep3-topic-skel ep3-topic-skel-w-65" />
          <Box className="ep3-topic-skel ep3-topic-skel-w-45" />
        </Box>
      </Box>

      <Box className="ep3-left-footer">
        <Text className="ep3-left-footer-brand">Ephemora</Text>
        <Box className="ep3-left-footer-links">
          <Anchor className="ep3-left-footer-link" component={Link} to="/about">
            About
          </Anchor>
          <Anchor className="ep3-left-footer-link" component={Link} to="/privacy">
            Privacy
          </Anchor>
          <Anchor className="ep3-left-footer-link" component={Link} to="/terms">
            Terms
          </Anchor>
        </Box>
      </Box>
    </Box>
  )
}
