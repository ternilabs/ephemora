export interface BootstrapResponse {
  app: {
    name: string
    productLabel: string
    tagline: string
    description: string
  }
  reset: {
    timezone: 'UTC'
    resetAt: string
    secondsRemaining: number
  }
  realtime: {
    url: string
  }
  limits: {
    messageMaxLength: number
    messageCooldownSeconds: number
    duplicateLimit: number
    duplicateMuteSeconds: number
    historyLimit: number
  }
  moderation: {
    underReviewReportThreshold: number
    hiddenReportThreshold: number
    aiEnabled: boolean
  }
}
