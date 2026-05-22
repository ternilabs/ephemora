import { Box, Group, Stack, Text, Textarea, UnstyledButton } from '@mantine/core'
import { SendHorizontal } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PresenceRosterUser, ReplyPreview } from '../../types/chat'

interface MentionDraft {
  start: number
  end: number
  query: string
}

type MutedIndicator =
  | {
      type: 'active'
    }
  | {
      type: 'countdown'
      label: string
    }

export default function MessageInput(props: {
  maxLength: number
  cooldownWindowMs: number
  cooldownRemainingMs: number
  muteRemainingMs: number
  isMuted?: boolean
  sendDisabled?: boolean
  inputLocked?: boolean
  replyTarget?: { id: string; preview: ReplyPreview } | null
  mentionUsers: PresenceRosterUser[]
  onClearReply?: () => void
  onSend: (content: string, replyToMessageId?: string) => void
}) {
  const [value, setValue] = useState('')
  const [caretPosition, setCaretPosition] = useState(0)
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const [mentionDismissed, setMentionDismissed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const mentionListboxId = useId()

  useEffect(() => {
    if (!props.replyTarget) return
    const textarea = textareaRef.current
    if (!textarea) return

    requestAnimationFrame(() => {
      textarea.focus()
      const nextCaret = textarea.value.length
      textarea.setSelectionRange(nextCaret, nextCaret)
    })
  }, [props.replyTarget])

  const len = value.length
  const trimmedValue = value.trim()
  const overLimit = len > props.maxLength
  const empty = trimmedValue.length === 0
  const muted = (props.isMuted ?? false) || props.muteRemainingMs > 0
  const coolingDown = props.cooldownRemainingMs > 0
  const mutedIndicator = useMemo<MutedIndicator | null>(() => {
    if (!muted) return null
    if (props.muteRemainingMs <= 0) return { type: 'active' }
    const totalSeconds = Math.max(0, Math.ceil(props.muteRemainingMs / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (minutes <= 0) return { type: 'countdown', label: `${seconds}s` }
    return { type: 'countdown', label: `${minutes}m ${String(seconds).padStart(2, '0')}s` }
  }, [muted, props.muteRemainingMs])

  const charColor = len > props.maxLength * 0.8 ? 'red' : 'dimmed'

  const cooldownProgress = useMemo(() => {
    if (!coolingDown) return 0
    if (props.cooldownWindowMs <= 0) return 0
    return Math.max(0, Math.min(100, (props.cooldownRemainingMs / props.cooldownWindowMs) * 100))
  }, [coolingDown, props.cooldownRemainingMs, props.cooldownWindowMs])

  const inputDisabled = !!props.sendDisabled || !!props.inputLocked || muted || coolingDown
  const disabled = inputDisabled || empty || overLimit

  const mentionDraft = useMemo<MentionDraft | null>(() => {
    const caret = Math.max(0, Math.min(caretPosition, value.length))
    const beforeCaret = value.slice(0, caret)
    const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/)
    if (!match) return null
    const query = match[1] ?? ''
    const start = caret - query.length - 1
    return { start, end: caret, query }
  }, [caretPosition, value])

  const mentionOptions = useMemo(() => {
    if (!mentionDraft) return []
    const q = mentionDraft.query.trim().toLowerCase()
    const deduped = new Map<string, PresenceRosterUser>()
    props.mentionUsers.forEach((user) => {
      if (!deduped.has(user.authorUserId)) {
        deduped.set(user.authorUserId, user)
      }
    })

    const users = [...deduped.values()]
    if (!q) return users.slice(0, 6)
    return users.filter((user) => user.nickname.toLowerCase().includes(q)).slice(0, 6)
  }, [mentionDraft, props.mentionUsers])

  const mentionListOpen = mentionDraft !== null && mentionOptions.length > 0 && !mentionDismissed
  const activeMentionOptionIndex =
    mentionOptions.length === 0 ? 0 : Math.max(0, Math.min(activeMentionIndex, mentionOptions.length - 1))
  const activeMentionOptionId =
    mentionListOpen && mentionOptions[activeMentionOptionIndex]
      ? `${mentionListboxId}-option-${mentionOptions[activeMentionOptionIndex].authorUserId}`
      : undefined

  const submitMessage = () => {
    if (disabled || !trimmedValue) return
    props.onSend(trimmedValue, props.replyTarget?.id)
    setValue('')
    setMentionDismissed(false)
    props.onClearReply?.()
  }

  const applyMention = (nickname: string) => {
    const draft = mentionDraft
    const textarea = textareaRef.current
    if (!draft || !textarea) return

    const next = `${value.slice(0, draft.start)}@${nickname} ${value.slice(draft.end)}`
    const nextCaret = draft.start + nickname.length + 2
    setValue(next)
    setActiveMentionIndex(0)
    setMentionDismissed(false)

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(nextCaret, nextCaret)
    })
  }

  return (
    <Stack gap={8} className="ep3-compose">
      {props.replyTarget ? (
        <Group className="ep3-reply-chip" justify="space-between" wrap="nowrap" gap={8}>
          <Box className="ep3-reply-chip-copy">
            <Text className="ep3-reply-chip-title">Replying to {props.replyTarget.preview.nickname}</Text>
            <Text className="ep3-reply-chip-preview">{props.replyTarget.preview.content}</Text>
          </Box>
          <UnstyledButton
            className="ep3-reply-chip-close"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              props.onClearReply?.()
              requestAnimationFrame(() => {
                textareaRef.current?.focus()
              })
            }}
            aria-label="Cancel reply"
          >
            ×
          </UnstyledButton>
        </Group>
      ) : null}
      <Group gap={8} wrap="nowrap" align="flex-end" className="ep3-compose-editor-row">
        <Textarea
          disabled={inputDisabled}
          className="ep3-compose-input"
          placeholder="Write something ephemeral..."
          value={value}
          onChange={(event) => {
            setValue(event.currentTarget.value)
            setCaretPosition(event.currentTarget.selectionStart)
            setMentionDismissed(false)
          }}
          ref={textareaRef}
          rows={1}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={mentionListOpen}
          aria-controls={mentionListOpen ? mentionListboxId : undefined}
          aria-activedescendant={activeMentionOptionId}
          onClick={(event) => setCaretPosition(event.currentTarget.selectionStart)}
          onSelect={(event) => setCaretPosition(event.currentTarget.selectionStart)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (mentionListOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              event.preventDefault()
              setActiveMentionIndex((current) => {
                const delta = event.key === 'ArrowDown' ? 1 : -1
                const next = current + delta
                if (next < 0) return mentionOptions.length - 1
                if (next >= mentionOptions.length) return 0
                return next
              })
              return
            }
            if (mentionListOpen && (event.key === 'Enter' || event.key === 'Tab')) {
              event.preventDefault()
              const target = mentionOptions[activeMentionOptionIndex]
              if (target) {
                applyMention(target.nickname)
              }
              return
            }
            if (mentionListOpen && event.key === 'Escape') {
              event.preventDefault()
              setMentionDismissed(true)
              return
            }
            if (event.key !== 'Enter' || event.shiftKey) return
            event.preventDefault()
            submitMessage()
          }}
        />
        {mentionListOpen ? (
          <Box id={mentionListboxId} className="ep3-mention-menu" role="listbox" aria-label="Mention suggestions">
            {mentionOptions.map((user, index) => (
              <UnstyledButton
                key={user.authorUserId}
                id={`${mentionListboxId}-option-${user.authorUserId}`}
                className={`ep3-mention-option${index === activeMentionOptionIndex ? ' ep3-mention-option-active' : ''}`}
                role="option"
                aria-selected={index === activeMentionOptionIndex}
                onMouseDown={(event) => {
                  event.preventDefault()
                  applyMention(user.nickname)
                }}
              >
                @{user.nickname}
              </UnstyledButton>
            ))}
          </Box>
        ) : null}
        <UnstyledButton
          className="ep3-send-icon"
          aria-label="Send message"
          disabled={disabled}
          onClick={submitMessage}
        >
          <SendHorizontal size={16} strokeWidth={1.9} />
        </UnstyledButton>
      </Group>

      <Group justify="space-between" align="center">
        <Group gap={10} wrap="nowrap" className="ep3-compose-meta-left">
          <Text className="ep3-char-count" c={charColor}>
            {len} / {props.maxLength}
          </Text>
          <Box className="ep3-cooldown-wrap">
            <Box className="ep3-cooldown-fill" style={{ width: coolingDown ? `${cooldownProgress}%` : '0%' }} />
          </Box>
        </Group>
        {mutedIndicator ? (
          <Text className="ep3-compose-muted-inline">
            {mutedIndicator.type === 'active' ? 'Muted' : `Muted for ${mutedIndicator.label}`}
          </Text>
        ) : null}
      </Group>
    </Stack>
  )
}
