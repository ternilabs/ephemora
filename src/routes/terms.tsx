import { createFileRoute } from '@tanstack/react-router'
import { Anchor, Box, Divider, List, Stack, Text, Title } from '@mantine/core'
import TwoPanelPageLayout from '../components/layout/TwoPanelPageLayout'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [{ title: 'Terms | Ephemora' }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <TwoPanelPageLayout title="Terms">
      <Box className="ep3-static-content">
        <Stack className="ep3-legal-content" gap="md">
          <Title order={1} className="ep3-legal-h1">
            Terms of Service
          </Title>
          <Text className="ep3-legal-updated">Last updated: May 27, 2026</Text>
          <Text>By accessing or using Ephemora, you agree to these Terms of Service.</Text>

          <Divider />

          <Title order={3}>1. What Ephemora is</Title>
          <Text>
            Ephemora is a public, anonymous-by-design chatroom. It is provided as-is, free of
            charge, with no guarantee of uptime or availability. The service is maintained by an
            individual developer and may be changed, suspended, or shut down at any time.
          </Text>

          <Divider />

          <Title order={3}>2. Who can use it</Title>
          <Text>
            You must be at least 13 years old to use Ephemora. By signing in, you confirm that you
            meet this requirement and can legally agree to these terms in your jurisdiction.
          </Text>

          <Divider />

          <Title order={3}>3. What you may not do</Title>
          <Text>You agree not to use Ephemora to:</Text>
          <List spacing="xs">
            <List.Item>Post content that is hateful, threatening, or incites violence toward any person or group.</List.Item>
            <List.Item>Harass, impersonate, or target specific individuals.</List.Item>
            <List.Item>Share explicit sexual content of any kind.</List.Item>
            <List.Item>Share personally identifiable information about others without their consent.</List.Item>
            <List.Item>Attempt to circumvent rate limits, moderation systems, or authentication.</List.Item>
            <List.Item>Use automated scripts, bots, or tools to send messages or flood the room.</List.Item>
            <List.Item>Post content that is illegal under applicable law.</List.Item>
          </List>

          <Divider />

          <Title order={3}>4. Moderation and bans</Title>
          <Text>
            Ephemora uses automated moderation tooling and moderator review to enforce safety
            rules. We may hide content, restrict participation, or apply temporary bans without
            prior notice.
          </Text>
          <Text>
            Most bans expire at the next daily reset (00:00 UTC). Repeated or severe violations may
            result in longer restrictions, including permanent account-level access removal.
          </Text>

          <Divider />

          <Title order={3}>5. Content ownership</Title>
          <Text>
            You retain ownership of content you submit. By posting a message, you grant Ephemora a
            limited, temporary license to process and display that content for operation and
            moderation of the room during its retention window.
          </Text>

          <Divider />

          <Title order={3}>6. Disclaimer of warranties</Title>
          <Text>
            Ephemora is provided without warranties of any kind, express or implied. We do not
            guarantee uninterrupted service, message delivery, or content accuracy. You use the
            service at your own risk.
          </Text>

          <Divider />

          <Title order={3}>7. Limitation of liability</Title>
          <Text>
            To the fullest extent permitted by law, the developer is not liable for indirect,
            incidental, special, consequential, or exemplary damages arising from or related to
            your use of Ephemora, including user-generated content.
          </Text>

          <Divider />

          <Title order={3}>8. Changes to these terms</Title>
          <Text>
            These terms may be updated periodically. Continued use of Ephemora after updates are
            published constitutes acceptance of the revised terms. The date at the top indicates
            the latest revision date.
          </Text>

          <Divider />

          <Title order={3}>9. Contact</Title>
          <Text>
            Questions about these terms can be emailed to{' '}
            <Anchor href="mailto:contact@mkgpdev.xyz">contact@mkgpdev.xyz</Anchor> or through{' '}
            <Anchor
              href="https://github.com/ternilabs/ephemora/issues"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ephemora GitHub issues (opens in new tab)"
            >
              GitHub issues
            </Anchor>{' '}
            of this project.
          </Text>
        </Stack>
      </Box>
    </TwoPanelPageLayout>
  )
}
