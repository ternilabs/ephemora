export interface ModerationReport {
  id: string
  supabase_user_id: string
  content: string
  report_count: number
  moderation_status: string
  ai_moderation_status: string
  ai_verdict: string | null
  ai_confidence: number | null
  ai_reason: string | null
  ai_severity: string | null
  ai_intent: string | null
  ai_targeting: string | null
  ai_categories: string[] | null
  policy_action: string | null
  policy_reason: string | null
  offense_count_at_decision: number | null
  manual_review_status: string
  created_at: string
  daily_identities: { nickname: string } | null
}

export interface ModerationAction {
  id: string
  target_type: string
  target_id: string
  action: string
  source: string
  actor_user_id: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface BannedUser {
  id: string
  supabase_user_id: string
  status: string
  banned_until: string | null
  ban_reason: string | null
  ban_source: string | null
  banned_at: string | null
}
