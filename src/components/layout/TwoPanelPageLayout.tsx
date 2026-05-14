import type { ReactNode } from 'react'
import { ActionIcon, Anchor, Box, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import LeftSidebar from './LeftSidebar'

export default function TwoPanelPageLayout(props: { title: string; children: ReactNode }) {
  return (
    <Box className="ep3-root ep3-root-no-right">
      <LeftSidebar />

      <Box className="ep3-middle">
        <Box className="ep3-mid-header">
          <Box className="ep3-page-title-wrap">
            <ActionIcon
              className="ep3-back-icon"
              variant="subtle"
              size="sm"
              component={Link}
              to="/"
              aria-label="Back to global chat"
            >
              ←
            </ActionIcon>
            <Text className="ep3-room-title">{props.title}</Text>
          </Box>
        </Box>

        <Box className="ep3-static-body">{props.children}</Box>

        <Box className="ep3-mobile-legal-links">
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
