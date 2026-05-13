import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import type { MessageReportPayload, ReportAck } from '../types/chat'

const REPORT_ACK_TIMEOUT_MS = 8000

function reportErrorMessage(error?: string): string {
  switch (error) {
    case 'timeout':
      return 'Server did not confirm in time. Please try again.'
    case 'no_socket':
      return 'Not connected. Check your connection and try again.'
    case 'rate_limited':
      return 'Too many reports. Please wait and try again.'
    case 'invalid_payload':
      return 'Invalid report details. Please retry.'
    case 'message_not_found':
      return 'Message no longer exists.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function useReportMessage(socket: Socket | null) {
  return useMutation({
    mutationFn: (payload: MessageReportPayload) =>
      new Promise<ReportAck>((resolve) => {
        if (!socket) {
          resolve({ ok: false, error: 'no_socket' })
          return
        }

        let settled = false
        const timeout = setTimeout(() => {
          if (settled) {
            return
          }
          settled = true
          resolve({ ok: false, error: 'timeout' })
        }, REPORT_ACK_TIMEOUT_MS)

        socket.emit('message:report', payload, (ack: ReportAck) => {
          if (settled) {
            return
          }
          settled = true
          clearTimeout(timeout)
          resolve(ack)
        })
      }),
    onSuccess: (ack) => {
      if (ack.ok) {
        notifications.show({ color: 'green', title: 'Report submitted', message: 'Thanks.' })
        return
      }

      if (ack.error === 'already_reported') {
        notifications.show({ color: 'blue', title: 'Already reported', message: 'We got it.' })
        return
      }

      notifications.show({
        color: 'red',
        title: 'Report failed',
        message: reportErrorMessage(ack.error),
      })
    },
  })
}
