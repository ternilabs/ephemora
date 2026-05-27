import { createFileRoute } from '@tanstack/react-router'
import { Anchor, Box, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { HandCoins, Star } from 'lucide-react'
import TwoPanelPageLayout from '../components/layout/TwoPanelPageLayout'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [{ title: 'About | Ephemora' }],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <TwoPanelPageLayout title="About">
      <Box className="ep3-static-content ep3-about-content">
        <Stack className="ep3-legal-content" gap="md">
          <Title order={1} className="ep3-legal-h1">
            About Ephemora
          </Title>
          <Text>
            Ephemora is a public chatroom that resets every day at <strong>00:00 UTC</strong>. Every message, every
            nickname, every trace of the day's conversation disappears automatically, completely,
            and without exception.
          </Text>
          <Text>
            There are no user profiles, no follower counts, and no persistent identities. When you
            join, the system assigns you a generated nickname for the day and the next day will be
            different. Nobody can connect today's you to yesterday's you unless you spoil it.
          </Text>

          <Paper withBorder p="md" radius={0} className="ep3-support-box">
            <Stack gap="sm">
              <Title order={4}>Support the Project</Title>
              <Text>
                If you're enjoying Ephemora, consider making a donation. I build and maintain this chat
                app entirely on my own, and your support helps me keep it running smoothly for everyone.
              </Text>
              <Text>
                If you can't swing a donation right now, no worries at all! You can still help me out
                massively by starring Ephemora on GitHub or sharing it with your friends.
              </Text>
              <Group gap="sm">
                <Button
                  component="a"
                  href="https://ko-fi.com/mkgpdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Donate on Ko-fi (opens in new tab)"
                  variant="light"
                  radius={0}
                  leftSection={<HandCoins size={15} strokeWidth={1.9} />}
                >
                  Donate
                </Button>
                <Button
                  component="a"
                  href="https://github.com/ternilabs/ephemora"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Star Ephemora on GitHub (opens in new tab)"
                  variant="default"
                  radius={0}
                  leftSection={<Star size={15} strokeWidth={1.9} />}
                >
                  Star on GitHub
                </Button>
              </Group>
            </Stack>
          </Paper>

          <Title order={3}>Moderation</Title>
          <Text>
            Ephemora uses user reports, AI-assisted triage, and moderator decisions to enforce room
            safety. Reported messages may be reviewed automatically first, then confirmed or
            overridden by moderators.
          </Text>
          <Text>
            Moderation actions can include message hiding and temporary bans. Most restrictions are
            tied to the daily reset cycle, with escalation available for repeated abuse.
          </Text>

          <Group className="ep3-about-meta" gap="md">
            <Text className="ep3-about-meta-item">
              Current version:{' '}
              <Anchor
                href="https://github.com/ternilabs/ephemora"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ephemora GitHub repository (opens in new tab)"
              >
                v{import.meta.env.VITE_APP_VERSION}
              </Anchor>
            </Text>
            <Text className="ep3-about-meta-item">
              Developed by{' '}
              <Anchor
                href="https://github.com/mkgp-dev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mark Kenneth Pelayo GitHub profile (opens in new tab)"
              >
                Mark Kenneth Pelayo
              </Anchor>
            </Text>
          </Group>
        </Stack>
      </Box>
    </TwoPanelPageLayout>
  )
}
