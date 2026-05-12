import { Button, Group } from '@mantine/core'

export default function JoinButton(props: { onGoogle: () => void; onGitHub: () => void }) {
  return (
    <Group gap="xs">
      <Button variant="default" onClick={props.onGoogle}>
        Google
      </Button>
      <Button variant="default" onClick={props.onGitHub}>
        GitHub
      </Button>
    </Group>
  )
}
