import { Button, Group } from '@mantine/core'
import { SiDiscord, SiGithub } from '@icons-pack/react-simple-icons'

export default function JoinButton(props: { onDiscord: () => void; onGitHub: () => void }) {
  return (
    <Group gap={8} wrap="wrap" className="ep3-join-actions">
      <Button
        variant="default"
        onClick={props.onDiscord}
        leftSection={
          <span aria-hidden="true">
            <SiDiscord size={15} />
          </span>
        }
      >
        Join with Discord
      </Button>
      <Button
        variant="default"
        onClick={props.onGitHub}
        leftSection={
          <span aria-hidden="true">
            <SiGithub size={15} />
          </span>
        }
      >
        Join with GitHub
      </Button>
    </Group>
  )
}
