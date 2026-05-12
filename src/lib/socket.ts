import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(import.meta.env.VITE_REALTIME_URL, {
      auth: { token },
      autoConnect: false,
    })
  }
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
