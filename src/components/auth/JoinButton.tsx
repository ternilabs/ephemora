import { Button, Group } from '@mantine/core'

export default function JoinButton(props: { onGoogle: () => void; onGitHub: () => void }) {
  return (
    <Group gap={8} wrap="wrap" className="ep3-join-actions">
      <Button variant="default" onClick={props.onGoogle}>
        Join with Google
      </Button>
      <Button variant="filled" onClick={props.onGitHub}>
        Join with GitHub
      </Button>
    </Group>
  )
}
