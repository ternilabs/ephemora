import { io, type Socket } from 'socket.io-client'

const realtimeUrl = import.meta.env.VITE_REALTIME_URL as string | undefined
if (!realtimeUrl) throw new Error('Missing VITE_REALTIME_URL')

let socket: Socket | null = null
let currentToken: string | null = null

export function getSocket(token: string): Socket {
  if (socket && currentToken !== token) {
    socket.disconnect()
    socket = null
  }

  if (!socket) {
    socket = io(realtimeUrl, {
      auth: { token },
      autoConnect: false,
    })
    currentToken = token
  }

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
  currentToken = null
}
