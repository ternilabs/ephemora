import { Stack, Table, Text } from '@mantine/core'
import { useModerationAiActions } from '../../hooks/useModerationAiActions'

export default function AiActionsTab(props: { enabled: boolean }) {
  const actions = useModerationAiActions(props.enabled)

  if (actions.isLoading) return <Text>Loading…</Text>
  if (actions.isError) return <Text>Failed to load.</Text>

  const rows = (actions.data ?? []).map((action) => (
    <Table.Tr key={action.id}>
      <Table.Td>{action.action}</Table.Td>
      <Table.Td>{action.target_type}</Table.Td>
      <Table.Td>{action.target_id}</Table.Td>
      <Table.Td>{action.source}</Table.Td>
      <Table.Td>{action.created_at}</Table.Td>
    </Table.Tr>
  ))

  return (
    <Stack gap="sm" py="md">
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Action</Table.Th>
            <Table.Th>Target</Table.Th>
            <Table.Th>ID</Table.Th>
            <Table.Th>Source</Table.Th>
            <Table.Th>At</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Stack>
  )
}
