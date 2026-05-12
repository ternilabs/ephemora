import { io, type Socket } from 'socket.io-client'

const realtimeUrl = import.meta.env.VITE_REALTIME_URL as string | undefined
if (!realtimeUrl) throw new Error('Missing VITE_REALTIME_URL')

let socket: Socket | null = null
let lastToken: string | null = null

export function getSocket(token: string): Socket {
  if (!socket || lastToken !== token) {
    socket?.disconnect()
    lastToken = token
    socket = io(realtimeUrl, {
      auth: { token },
      autoConnect: false,
    })
  }

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
  lastToken = null
}
