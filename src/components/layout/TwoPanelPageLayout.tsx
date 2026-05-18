import type { ReactNode } from 'react'
import { ActionIcon, Box, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import LeftSidebar from './LeftSidebar'

export default function TwoPanelPageLayout(props: { title: string; children: ReactNode }) {
  return (
    <Box className="ep3-root ep3-root-no-right">
      <LeftSidebar showPresence={false} />

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
              <ArrowLeft size={16} />
            </ActionIcon>
            <Text className="ep3-room-title">{props.title}</Text>
          </Box>
        </Box>

        <Box className="ep3-static-body">{props.children}</Box>
      </Box>
    </Box>
  )
}
