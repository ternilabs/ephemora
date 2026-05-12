import { useEffect, useRef, useState } from 'react'

export function useCountdown(opts: { resetAt?: string; onZero?: () => void }) {
  const { resetAt, onZero } = opts
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const firedZeroRef = useRef(false)

  useEffect(() => {
    firedZeroRef.current = false
  }, [resetAt])

  useEffect(() => {
    if (!resetAt) return

    const tick = () => {
      const sec = Math.max(
        0,
        Math.floor((new Date(resetAt).getTime() - Date.now()) / 1000),
      )
      setSecondsRemaining(sec)
      if (sec === 0 && !firedZeroRef.current) {
        firedZeroRef.current = true
        onZero?.()
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [resetAt, onZero])

  return { secondsRemaining }
}
