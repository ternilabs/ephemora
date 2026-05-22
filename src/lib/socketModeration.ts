function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null
  return value as Record<string, unknown>
}

function getNestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  const record = asRecord(value)
  if (!record) return null
  return asRecord(record[key])
}

function getRecordNumber(record: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return null
}

function getRecordString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return null
}

function normalizeRemainingMs(candidate: number | null): number | null {
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return null
  return Math.max(0, candidate)
}

export function getMuteRemainingMs(payload: unknown, nowMs = Date.now()): number | null {
  const record = asRecord(payload)
  if (!record) return null

  const direct = normalizeRemainingMs(
    getRecordNumber(record, ['muteRemainingMs', 'remainingMs', 'mute_remaining_ms', 'remaining_ms']),
  )
  if (direct !== null) return direct

  const restriction = getNestedRecord(record, 'restriction')
  if (!restriction) return null

  const fromRestriction = normalizeRemainingMs(
    getRecordNumber(restriction, ['remainingMs', 'muteRemainingMs', 'remaining_ms', 'mute_remaining_ms']),
  )
  if (fromRestriction !== null) return fromRestriction

  const untilString = getRecordString(restriction, ['until', 'mutedUntil', 'muted_until'])
  if (!untilString) return null
  const untilMs = Date.parse(untilString)
  if (!Number.isFinite(untilMs)) return null
  return Math.max(0, untilMs - nowMs)
}

export function getConnectErrorCode(error: unknown): string | null {
  const errorRecord = asRecord(error)
  if (!errorRecord) return null

  const directCodeValue = errorRecord.code
  if (typeof directCodeValue === 'string' && directCodeValue.length > 0) {
    return directCodeValue.toLowerCase()
  }

  const dataValue = errorRecord.data
  const messageValue = errorRecord.message

  if (typeof dataValue === 'object' && dataValue !== null) {
    const dataRecord = asRecord(dataValue)
    if (!dataRecord) return null

    const directCode = getRecordString(dataRecord, ['code', 'error', 'reason'])
    if (directCode) return directCode.toLowerCase()

    const nestedError = getNestedRecord(dataRecord, 'error')
    if (nestedError) {
      const nestedCode = getRecordString(nestedError, ['code', 'error', 'reason'])
      if (nestedCode) return nestedCode.toLowerCase()
    }

    const restriction = getNestedRecord(dataRecord, 'restriction')
    if (restriction) {
      const restrictionCode = getRecordString(restriction, ['code', 'status', 'action', 'type'])
      if (restrictionCode) return restrictionCode.toLowerCase()
    }
  }

  if (typeof messageValue === 'string' && messageValue.length > 0) {
    return messageValue.toLowerCase()
  }

  return null
}

export function isMutedConnectError(error: unknown): boolean {
  const code = getConnectErrorCode(error)
  if (!code) return false
  return code.includes('muted') || code.includes('mute')
}

export function isBannedConnectError(error: unknown): boolean {
  const code = getConnectErrorCode(error)
  if (!code) return false
  return code.includes('banned') || code.includes('ban')
}

export function getConnectErrorData(error: unknown): unknown {
  const errorRecord = asRecord(error)
  if (!errorRecord) return undefined
  return errorRecord.data
}

export function getMutedConnectRemainingMs(error: unknown, nowMs = Date.now()): number | null {
  return getMuteRemainingMs(getConnectErrorData(error), nowMs)
}

export function getMutedNotificationMessage(remainingMs: number | null): string {
  if (remainingMs === null) return 'You are currently muted.'
  return `Muted for ${Math.ceil(remainingMs / 1000)}s.`
}
