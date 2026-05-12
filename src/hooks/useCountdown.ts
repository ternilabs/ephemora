import { useEffect, useRef, useState } from 'react'

export function useCountdown(opts: {
  resetAt?: string | undefined
  onZero?: (() => void) | undefined
}) {
  const { resetAt, onZero } = opts
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const firedZeroRef = useRef(false)

  useEffect(() => {
    firedZeroRef.current = false
  }, [resetAt])

  useEffect(() => {
    if (!resetAt) return
    const resetAtMs = new Date(resetAt).getTime()

    const tick = () => {
      if (Number.isNaN(resetAtMs)) {
        setSecondsRemaining(0)
        return
      }

      const sec = Math.max(0, Math.floor((resetAtMs - Date.now()) / 1000))
      setSecondsRemaining(sec)
      if (sec === 0 && !firedZeroRef.current) {
        firedZeroRef.current = true
        onZero?.()
      }
    }

    const timeoutId = window.setTimeout(tick, 0)
    if (Number.isNaN(resetAtMs)) {
      return () => window.clearTimeout(timeoutId)
    }

    const intervalId = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [resetAt, onZero])

  return { secondsRemaining }
}
