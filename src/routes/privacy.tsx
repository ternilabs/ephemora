import { createFileRoute } from '@tanstack/react-router'
import { Anchor, Box, Divider, List, Stack, Table, Text, Title } from '@mantine/core'
import TwoPanelPageLayout from '../components/layout/TwoPanelPageLayout'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [{ title: 'Privacy | Ephemora' }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <TwoPanelPageLayout title="Privacy">
      <Box className="ep3-static-content">
        <Stack className="ep3-legal-content" gap="md">
          <Title order={1} className="ep3-legal-h1">
            Privacy Policy
          </Title>
          <Text className="ep3-legal-updated">Last updated: May 27, 2026</Text>
          <Text>
            Ephemora is built around the principle that most data should not exist longer than it
            needs to. This policy explains what we collect, why we collect it, and how long it
            exists.
          </Text>

          <Divider />

          <Title order={3}>1. What we collect</Title>
          <Text>
            When you sign in through Discord or GitHub, Supabase Auth receives your name, email
            address, and profile picture from that provider.
          </Text>
          <Text>Within Ephemora, we store only what is needed:</Text>
          <List>
            <List.Item>Your provider user ID (internal reference).</List.Item>
            <List.Item>A generated daily nickname linked to your account for the active UTC day.</List.Item>
            <List.Item>Messages you send, retained until the next daily reset at 00:00 UTC.</List.Item>
            <List.Item>Report and moderation metadata needed for safety operations.</List.Item>
          </List>
          <Text>We do not use ad trackers and we do not sell personal data.</Text>

          <Divider />

          <Title order={3}>2. How we use your data</Title>
          <Text>We use data only to operate, secure, and moderate the service:</Text>
          <List>
            <List.Item>To authenticate access to the chatroom.</List.Item>
            <List.Item>To assign and maintain your daily nickname.</List.Item>
            <List.Item>To deliver messages in the live room.</List.Item>
            <List.Item>To review reports and apply safety actions.</List.Item>
          </List>
          <Text>
            Reported content may be processed by Cloudflare for moderation support. Moderation
            actions are logged with minimal metadata for accountability.
          </Text>

          <Divider />

          <Title order={3}>3. Data retention</Title>
          <Text>
            Chat messages and daily nicknames are deleted at 00:00 UTC each day. Ephemora does not
            provide an archive or restoration of prior-day room content.
          </Text>
          <Text>
            Safety and moderation logs may be retained for up to 30 days to investigate abuse,
            enforce bans, and improve moderation consistency.
          </Text>

          <Divider />

          <Title order={3}>4. Third-party services</Title>
          <Table className="ep3-legal-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Service</Table.Th>
                <Table.Th>Purpose</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Supabase</Table.Td>
                <Table.Td>Authentication and database hosting</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Cloudflare</Table.Td>
                <Table.Td>Automated content moderation and frontend hosting</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Render</Table.Td>
                <Table.Td>Realtime service hosting</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          <Text>Each service has its own privacy terms and processing practices.</Text>

          <Divider />

          <Title order={3}>5. Your rights</Title>
          <Text>
            Because messages are deleted daily, retrieval requests for historical messages are
            generally not possible. You may request deletion of account-linked records retained by
            Ephemora (for example, internal user ID references and moderation logs), subject to
            legal and operational requirements.
          </Text>

          <Divider />

          <Title order={3}>6. Contact</Title>
          <Text>
            For privacy questions or record deletion requests, please email directly at{' '}
            <Anchor href="mailto:contact@mkgpdev.xyz">contact@mkgpdev.xyz</Anchor> or open an
            issue on the project's GitHub repository.
          </Text>
        </Stack>
      </Box>
    </TwoPanelPageLayout>
  )
}
