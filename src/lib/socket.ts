import { io, type Socket } from 'socket.io-client'

const realtimeUrl = import.meta.env.VITE_REALTIME_URL as string | undefined
if (!realtimeUrl) throw new Error('Missing VITE_REALTIME_URL')

let socket: Socket | null = null
let lastToken: string | null = null

export function getSocket(token: string): Socket {
  if (!socket || lastToken !== token) {
    socket?.disconnect()
    socket = null
    const nextSocket = io(realtimeUrl, {
      auth: { token },
      autoConnect: false,
    })
    socket = nextSocket
    lastToken = token
  }

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
  lastToken = null
}
