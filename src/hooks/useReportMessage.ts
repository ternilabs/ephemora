import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import type { MessageReportPayload, ReportAck } from '../types/chat'

export function useReportMessage(socket: Socket | null) {
  return useMutation({
    mutationFn: (payload: MessageReportPayload) =>
      new Promise<ReportAck>((resolve) => {
        if (!socket) {
          resolve({ ok: false, error: 'no_socket' })
          return
        }

        socket.emit('message:report', payload, (ack: ReportAck) => {
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
        message: ack.error ?? 'Unknown error',
      })
    },
  })
}
