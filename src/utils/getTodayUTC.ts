export function getTodayUTC(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function isSameUtcDay(iso: string, now = new Date()): boolean {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) {
    return false
  }
  const date = new Date(timestamp)
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}
