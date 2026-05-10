# PRD — Ephemora (Stage 1 / MVP)

> **Tagline:** Say it today. Let it fade tomorrow.
> **Version:** 5.0 — Visitor Read + Infinite Scroll + Moderation Corrections

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution](#2-solution)
3. [User Stories](#3-user-stories)
4. [Architecture Overview](#4-architecture-overview)
5. [Key Architectural Decisions](#5-key-architectural-decisions)
6. [Supabase SQL Schema](#6-supabase-sql-schema)
7. [Render Realtime Backend — `ephemora-realtime-server`](#7-render-realtime-backend--ephemora-realtime-server)
8. [AI Moderation — Cloudflare Workers AI](#8-ai-moderation--cloudflare-workers-ai)
9. [Moderation Board](#9-moderation-board)
10. [Frontend — React + Vite + TypeScript](#10-frontend--react--vite--typescript)
11. [Reset & Nickname Logic](#11-reset--nickname-logic)
12. [Stage 1 Improvement Proposals](#12-stage-1-improvement-proposals)
13. [Testing Decisions](#13-testing-decisions)
14. [Build Order](#14-build-order)
15. [Out of Scope](#15-out-of-scope)
16. [Further Notes](#16-further-notes)

---

## 1. Problem Statement

Users want a low-stakes, spontaneous way to have public conversations online without building a permanent digital identity or leaving a lasting footprint. Existing platforms require profile setup, persist message history indefinitely, and tie participation to a permanent public persona — creating social friction and privacy concerns that discourage casual, in-the-moment expression.

---

## 2. Solution

Ephemora is a daily-reset global chatroom. Users sign in with Google or GitHub, receive a system-generated nickname, and join a single shared public room. At 00:00 UTC every day, all messages are physically deleted and all public nicknames rotate. There is no persistent profile, no visible history beyond the current day, and no permanent record. A conversation can matter in the moment without needing to matter forever.

---

## 3. User Stories

### Authentication & Identity

1. As a visitor, I want to read today’s live chat stream and scroll up to load earlier messages without logging in, so that I can understand Ephemora before participating.
2. As a visitor, I want to click a "Join the Chat" button to initiate login with minimal friction.
3. As a visitor, I want to sign in with my Google account, so that I do not need to create a separate account.
4. As a visitor, I want to sign in with my GitHub account, so that I have an alternative social login option.
5. As a new user, I want the system to assign me a generated nickname automatically on my first connection of the day.
6. As a returning user on the same day, I want my nickname to remain consistent within the session.
7. As a returning user, I want my nickname to change automatically after the daily reset so today's identity is not traceable tomorrow.
8. As a logged-in user, I want to see my current nickname in the header.
9. As a logged-in user, I want to log out at any time.

### Chat Experience

10. As a logged-in user, I want to type and send a text or emoji message so all connected users can read it.
11. As a logged-in user, I want my message to appear in the stream immediately after sending.
12. As any user, I want to read messages from all participants in real time without refreshing.
13. As a logged-in user, I want to see today's messages when I first connect, so I can follow the conversation in context.
14. As a logged-in user, I want to be blocked from sending another message for 5 seconds after my last one, to prevent flooding.
15. As a logged-in user, I want a visual indicator when I am in cooldown.
16. As a logged-in user, I want messages over 500 characters to be rejected.
17. As a logged-in user, I want to be blocked from sending the same message a third consecutive time and receive a 5-minute mute.
18. As a muted user, I want to see how long my mute lasts.

### Reset & Countdown

19. As any user, I want to see a live countdown to the next daily reset.
20. As a connected user, I want the message list to clear automatically at the reset moment, without a page reload.
21. As a connected user, I want to receive a real-time `chat:reset` event so my UI transitions cleanly.

### Reporting & Moderation

22. As a logged-in user, I want to report a message I find harmful.
23. As a logged-in user, I want a confirmation after submitting a report.
24. As a logged-in user, I want to be prevented from reporting the same message twice.
25. As any user, I want messages with 5+ reports to be hidden automatically.
26. As any user, I want messages with 3–4 reports to be marked as under review.
27. As a moderator, I want to access a moderation board so I can review AI decisions and take manual actions.
28. As a moderator, I want to see items the AI flagged as uncertain or failed to process.
29. As a moderator, I want to hide, restore, or mark a message as reviewed.
30. As a moderator, I want to temporarily ban or unban a user.
31. As a moderator, I want a log of all moderation actions so I can audit AI decisions and overrides.

### Connection & Availability

32. As a user, I want to see a connection status indicator at all times.
33. As a user, I want to see a friendly message if the Render server is unreachable.
34. As a user, I want the app to attempt automatic reconnection after a drop.

### Legal & Informational

35. As a visitor, I want an About page explaining what Ephemora is.
36. As a visitor, I want a Privacy Policy.
37. As a visitor, I want Terms of Service.
38. As a visitor, I want `/about`, `/privacy`, and `/terms` to be real, indexable routes.
39. As a user, I want About, Privacy, and Terms links accessible from the footer at all times.

---

## 4. Architecture Overview

```
ephemora.mkgpdev.xyz
  → Cloudflare Pages
  → React + Vite + TypeScript + Mantine UI

realtime.mkgpdev.xyz
  → Render (ephemora-realtime-server)
  → Fastify + Socket.IO + TypeScript
  → Public HTTP: /health, /reset-time, /bootstrap, /messages
  → Realtime chat events (Socket.IO)
  → AI moderation orchestration for reported messages

Supabase
  → Auth: Google + GitHub OAuth
  → Postgres: Ephemora tables (SQL migrations, no Prisma)
  → RLS enabled on all Ephemora tables

api.mkgpdev.xyz
  → Existing Vercel NestJS backend
  → BlogModule, WeatherModule, AiModule
  → NOT used by Ephemora Stage 1 — untouched
```

### Responsibility Boundaries

| Layer | Owns |
|---|---|
| Frontend | UI rendering, Supabase Auth, Socket.IO connection, countdown, message list, moderation board UI |
| Render realtime backend | HTTP support endpoints, Socket.IO server, auth verification, identity resolution, cooldowns, message pipeline, chat history, AI moderation, moderation HTTP API, cleanup cron |
| Supabase | Auth source of truth, Postgres storage for all Ephemora tables |
| Cloudflare Workers AI | AI moderation inference via OpenAI-compatible API |

> **Hard rule:** The Vercel backend (`api.mkgpdev.xyz`) is entirely untouched by Ephemora Stage 1. It continues serving Blog, Weather, and AI endpoints only.

---

## 5. Key Architectural Decisions

### Vercel Backend Decision

Ephemora Stage 1 does not use the existing Vercel backend.

The existing `api.mkgpdev.xyz` NestJS backend remains untouched and continues serving non-Ephemora features such as Blog, Weather, and AI endpoints.

Earlier drafts included a Vercel `EphemoraModule` for bootstrap and reset-time endpoints. This has been removed because the Render realtime backend already runs Fastify and can own these HTTP support endpoints directly, keeping the Ephemora codebase fully self-contained.

### Database Decision — No Prisma for Ephemora

Ephemora Stage 1 does not use Prisma.

The existing Vercel backend keeps its current Prisma setup for Blog features unchanged. Ephemora tables are created directly in Supabase Postgres using SQL migrations run from the Supabase dashboard or CLI.

The Render realtime backend accesses Ephemora tables using `@supabase/supabase-js` with the service role key.

Prisma may be reconsidered in a later stage if Ephemora needs complex relational querying or heavier transaction workflows.

### Auth Decision

Ephemora Stage 1 uses Supabase Auth.

Supabase Auth handles Google/GitHub OAuth, sessions, access tokens, and logout. The frontend uses the Supabase client only for authentication.

The Render realtime backend allows unauthenticated Socket.IO connections for **read-only** visitor access.

- If a Supabase access token is present and valid, the socket becomes **authenticated** and may use write-capability events (`message:send`, `message:report`).
- If no token is present, the socket is **visitor** and is restricted to server → client events only. Any client → server write events must be rejected.

Better Auth with Supabase Postgres was considered because it avoids Supabase Auth MAU limits and provides more auth control. It was rejected for Stage 1 because it adds unnecessary complexity around OAuth routes, session handling, auth tables, cookies, and Socket.IO session verification. Better Auth may be reconsidered after MVP if Ephemora approaches Supabase Auth limits or needs auth independence.

### RLS Decision

Enable RLS on all Ephemora tables from Stage 1.

No frontend read/write policies are added for Stage 1. This means browser clients cannot directly access `ephemera_users`, `daily_identities`, `ephemera_messages`, `ephemera_reports`, or `moderation_actions`, even when authenticated.

All Ephemora database operations go through the Render realtime backend using `SUPABASE_SERVICE_ROLE_KEY`.

> **Security rule:** The service role key must only exist in Render environment variables. It must never appear in Vite env vars, Cloudflare Pages env vars, browser code, GitHub, or logs.

### Message Expiration Model

Ephemora uses a global daily reset, not per-message rolling expiration.

All messages created during the current UTC day receive the same `expires_at` value: the next UTC midnight.

At 00:00 UTC, all messages from the previous cycle are physically deleted from the database, even if they were sent shortly before reset.

- Message sent at `09:00 UTC` → expires at next `00:00 UTC`
- Message sent at `23:59 UTC` → also expires at next `00:00 UTC`

This reinforces the product concept: the entire room fades together at the daily reset.

### Cron Reliability Note

The Render backend uses `node-cron` for cleanup and reset broadcasts. Because in-app cron only runs while the Render web service is awake, reset logic must not depend on cron alone.

Stage 1 uses four reset safeguards:
1. Render emits `chat:reset` at `00:00 UTC` via `node-cron`.
2. Messages are saved with `expires_at` equal to the next UTC midnight.
3. The frontend countdown clears local messages when the timer reaches zero, regardless of whether `chat:reset` was received.
4. UptimeRobot or Better Stack pings `/health` every 5 minutes to keep the service awake and reduce missed-cron risk.

### AI Moderation Decision

Ephemora uses automatic-first moderation for reported messages.

When a message is reported, the Render realtime backend saves the report, applies report-count fallback thresholds, and automatically sends the reported content to Cloudflare Workers AI using `@cf/openai/gpt-oss-20b` through an OpenAI-compatible API call.

AI may classify reported content as `safe`, `harmful`, or `uncertain`.

If AI classifies a message as harmful, the backend may automatically hide the message. For severe or repeated harmful behavior, the backend may temporarily ban the user until the next UTC reset.

If AI is unavailable, rate-limited, over quota, or returns `uncertain`, the item is placed in the manual moderation queue.

AI moderation is automatic, but moderator override is always available.

---

## 6. Supabase SQL Schema

### Migration file: `supabase/migrations/0001_ephemora_initial.sql`

Run via Supabase CLI: `supabase db push` or paste directly into the Supabase SQL editor.

```sql
-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type ephemera_user_role as enum ('user', 'moderator');
create type ephemera_user_status as enum ('active', 'banned');
-- moderation_status semantics:
--   visible      → shown normally
--   under_review → still shown, but UI displays an "Under review" badge
--   hidden       → removed from main chat views; visible only in moderation tooling
create type moderation_status as enum ('visible', 'under_review', 'hidden');
create type ai_moderation_status as enum (
  'not_required', 'pending', 'safe', 'harmful', 'uncertain', 'limited', 'failed'
);
create type manual_review_status as enum ('none', 'pending', 'reviewed');
create type moderation_action_type as enum (
  'hide_message', 'restore_message', 'ban_user', 'unban_user', 'mark_reviewed', 'queue_review'
);
create type moderation_source as enum ('ai', 'moderator', 'threshold', 'system');

-- ─── EphemeraUser ─────────────────────────────────────────────────────────────
-- Internal Ephemora identity. supabase_user_id maps to auth.users.id.
-- Completely independent from the blog's User table (different service, different schema).
create table ephemera_users (
  id                uuid primary key default gen_random_uuid(),
  supabase_user_id  uuid not null unique,
  provider          text,
  role              ephemera_user_role not null default 'user',
  status            ephemera_user_status not null default 'active',
  risk_score        integer not null default 0,
  banned_until      timestamptz,
  ban_reason        text,
  ban_source        text,         -- 'ai' | 'moderator' | 'system'
  banned_at         timestamptz,
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz not null default now()
);

create index idx_ephemera_users_supabase_user_id on ephemera_users (supabase_user_id);
create index idx_ephemera_users_role on ephemera_users (role);
create index idx_ephemera_users_status on ephemera_users (status);

-- ─── DailyIdentity ────────────────────────────────────────────────────────────
-- One record per user per reset day. reset_day is "YYYY-MM-DD" UTC.
-- Nickname is stored here after deterministic generation; never regenerated mid-day.
-- Privacy alignment: daily_identities older than the current reset day are deleted after reset.
create table daily_identities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references ephemera_users (id) on delete cascade,
  reset_day   text not null,       -- "YYYY-MM-DD" UTC, e.g. "2026-05-10"
  nickname    text not null,
  avatar_seed text,
  created_at  timestamptz not null default now(),

  unique (user_id, reset_day)
);

create index idx_daily_identities_reset_day on daily_identities (reset_day);
create index idx_daily_identities_user_id   on daily_identities (user_id);

-- ─── EphemeraMessage ──────────────────────────────────────────────────────────
create table ephemera_messages (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references ephemera_users (id) on delete cascade,
  daily_identity_id   uuid not null references daily_identities (id) on delete cascade,
  content             text not null,
  reply_to_message_id uuid references ephemera_messages (id) on delete set null,

  -- Expiry
  expires_at          timestamptz not null,

  -- Report-threshold moderation
  report_count        integer not null default 0,
  moderation_status   moderation_status not null default 'visible',

  -- AI moderation fields
  ai_moderation_status  ai_moderation_status not null default 'not_required',
  ai_verdict            text,                 -- 'safe' | 'harmful' | 'uncertain'
  ai_confidence         numeric(5, 4),        -- 0.0000–1.0000
  ai_reason             text,
  ai_moderated_at       timestamptz,

  -- Visibility tracking
  hidden_by_source    text,                   -- 'ai' | 'moderator' | 'threshold'
  hidden_at           timestamptz,

  -- Manual review
  manual_review_status  manual_review_status not null default 'none',

  created_at          timestamptz not null default now()
);

create index idx_ephemera_messages_created_at          on ephemera_messages (created_at desc);
create index idx_ephemera_messages_expires_at          on ephemera_messages (expires_at);
create index idx_ephemera_messages_moderation_status   on ephemera_messages (moderation_status);
create index idx_ephemera_messages_ai_moderation_status on ephemera_messages (ai_moderation_status);
create index idx_ephemera_messages_user_id             on ephemera_messages (user_id);
create index idx_ephemera_messages_manual_review_status on ephemera_messages (manual_review_status);

-- ─── EphemeraReport ───────────────────────────────────────────────────────────
create table ephemera_reports (
  id               uuid primary key default gen_random_uuid(),
  message_id       uuid not null references ephemera_messages (id) on delete cascade,
  reporter_user_id uuid not null references ephemera_users (id) on delete cascade,
  reason           text,
  created_at       timestamptz not null default now(),

  unique (message_id, reporter_user_id)
);

create index idx_ephemera_reports_message_id on ephemera_reports (message_id);

-- ─── ModerationAction ─────────────────────────────────────────────────────────
-- Audit log for every moderation event: AI decisions, moderator actions, threshold events.
-- Persists beyond message expiry so moderators can audit history.
create table moderation_actions (
  id            uuid primary key default gen_random_uuid(),
  target_type   text not null,           -- 'message' | 'user'
  target_id     uuid not null,           -- logical reference only; message targets may be deleted after reset
  action        moderation_action_type not null,
  source        moderation_source not null,
  actor_user_id uuid references ephemera_users (id) on delete set null,
  reason        text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index idx_moderation_actions_target_id   on moderation_actions (target_id);
create index idx_moderation_actions_source      on moderation_actions (source);
create index idx_moderation_actions_action      on moderation_actions (action);
create index idx_moderation_actions_created_at  on moderation_actions (created_at desc);
create index idx_moderation_actions_actor       on moderation_actions (actor_user_id);

-- ─── RLS — Enable on all Ephemora tables ────────────────────────────────────
-- No client-facing policies for Stage 1.
-- All access goes through Render using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
alter table ephemera_users       enable row level security;
alter table daily_identities     enable row level security;
alter table ephemera_messages    enable row level security;
alter table ephemera_reports     enable row level security;
alter table moderation_actions   enable row level security;

-- ─── RPC Helpers ────────────────────────────────────────────────────────────
-- Atomic report_count increment + threshold moderation to avoid race conditions.
create or replace function ephemora_increment_report_count(
  p_message_id uuid,
  p_under_review_threshold integer,
  p_hidden_threshold integer
) returns table (
  message_id uuid,
  report_count integer,
  moderation_status moderation_status,
  content text,
  user_id uuid
) language plpgsql security definer as $$
declare
  v_row ephemera_messages%rowtype;
begin
  update ephemera_messages
  set
    report_count = report_count + 1,
    moderation_status = case
      when report_count + 1 >= p_hidden_threshold then 'hidden'
      when report_count + 1 >= p_under_review_threshold and moderation_status = 'visible' then 'under_review'
      else moderation_status
    end,
    hidden_by_source = case
      when report_count + 1 >= p_hidden_threshold and moderation_status <> 'hidden' then 'threshold'
      else hidden_by_source
    end,
    hidden_at = case
      when report_count + 1 >= p_hidden_threshold and moderation_status <> 'hidden' then now()
      else hidden_at
    end
  where id = p_message_id
  returning * into v_row;

  return query select v_row.id, v_row.report_count, v_row.moderation_status, v_row.content, v_row.user_id;
end;
$$;
```

### Moderation Audit Retention Note

Expired chat messages and their report records are physically deleted after the daily reset.

Moderation actions are stored separately in `moderation_actions` so moderators can review AI decisions, banned users, manual overrides, and unban history even after the original message expires. The moderation audit log does not preserve public chat history — it stores only action metadata needed for safety and accountability.

---

## 7. Render Realtime Backend — `ephemora-realtime-server`

New standalone repository: **`ephemora-realtime-server`**. Not part of the NestJS monorepo.

Domain: **`realtime.mkgpdev.xyz`**

### Stack

| Package | Purpose |
|---------|---------|
| `fastify` ^5 | HTTP server for `/health`, `/reset-time`, `/bootstrap`, `/messages`, moderation endpoints |
| `socket.io` ^4 | Real-time event transport |
| `typescript` ^5 strict mode | Type safety throughout |
| `@supabase/supabase-js` ^2 | Service-role Supabase client — all DB operations |
| `zod` ^4 | Env validation + message payload validation |
| `unique-names-generator` ^4 | Deterministic nickname generation — 50M+ combos, native `seed` support |
| `openai` ^4 | Cloudflare Workers AI via OpenAI-compatible endpoint |
| `node-cron` ^3 | Cleanup cron + midnight reset broadcast |
| `tsx` ^4 (dev only) | TypeScript dev runner |

### `package.json` (key entries)

```json
{
  "dependencies": {
    "fastify": "^5.x",
    "socket.io": "^4.x",
    "@supabase/supabase-js": "^2.x",
    "zod": "^4.x",
    "unique-names-generator": "^4.x",
    "openai": "^4.x",
    "node-cron": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^22.x",
    "@types/node-cron": "^3.x",
    "tsx": "^4.x",
    "vitest": "^2.x"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "vitest"
  }
}
```

### Folder structure

```
ephemora-realtime-server/
├── src/
│   ├── server.ts                              # Entry: Fastify + Socket.IO bootstrap
│   ├── env.ts                                 # Zod env validation + config constants
│   │
│   ├── lib/
│   │   ├── supabase.ts                        # Supabase service-role singleton
│   │   └── ai.ts                              # OpenAI client pointed at Cloudflare Workers AI
│   │
│   ├── http/
│   │   ├── routes/
│   │   │   ├── health.route.ts                # GET /health
│   │   │   ├── reset-time.route.ts            # GET /reset-time
│   │   │   ├── bootstrap.route.ts             # GET /bootstrap
│   │   │   ├── messages.route.ts              # GET /messages (unauthenticated, paginated)
│   │   │   └── moderation.route.ts            # GET+POST /moderation/*
│   │   └── middleware/
│   │       └── requireModerator.ts            # Verifies token + role = moderator
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   └── verifySupabaseToken.ts         # Verifies Supabase JWT; returns VerifiedUser
│   │   │
│   │   ├── identity/
│   │   │   ├── dailyIdentity.service.ts       # Upsert DailyIdentity for (userId, resetDay)
│   │   │   └── nickname.generator.ts          # unique-names-generator with seed
│   │   │
│   │   ├── chat/
│   │   │   ├── chat.gateway.ts                # Socket.IO event handlers
│   │   │   ├── chat.service.ts                # Message send pipeline (8 steps)
│   │   │   └── chat.types.ts                  # Shared TS interfaces for all events
│   │   │
│   │   ├── messages/
│   │   │   ├── message.repository.ts          # Supabase DB ops: save, history, delete
│   │   │   └── cleanup.ts                     # node-cron: delete expired + emit chat:reset
│   │   │
│   │   ├── rate-limit/
│   │   │   ├── cooldown.service.ts            # 5s per-user cooldown (in-memory Map)
│   │   │   └── duplicate.service.ts           # Duplicate detection + mute (in-memory Map)
│   │   │
│   │   ├── reports/
│   │   │   └── report.service.ts              # Save report, thresholds, trigger AI
│   │   │
│   │   └── moderation/
│   │       ├── ai.service.ts                  # Cloudflare Workers AI moderation
│   │       ├── moderation.service.ts          # Moderator actions: hide, restore, ban, unban
│   │       └── moderationAction.repository.ts # Save/query ModerationAction audit records
│   │
│   └── utils/
│       ├── getNextReset.ts                    # UTC midnight calculator
│       ├── normalizeMessage.ts                # Trim + collapse whitespace
│       └── sanitizeMessage.ts                 # Strip control characters
│
├── tsconfig.json
├── render.yaml
└── .env.example
```

### `src/env.ts`

```ts
import { z } from 'zod';

const schema = z.object({
  PORT:                          z.coerce.number().default(4000),
  NODE_ENV:                      z.string().default('development'),
  FRONTEND_ORIGIN:               z.string().default('http://localhost:5173'),
  REALTIME_PUBLIC_URL:           z.string().default('http://localhost:4000'),
  SUPABASE_URL:                  z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY:     z.string().min(1),
  CLOUDFLARE_ACCOUNT_ID:         z.string().min(1),
  CLOUDFLARE_API_TOKEN:          z.string().min(1),
  CLOUDFLARE_WORKERS_AI_BASE_URL: z.string().min(1),

  // Optional overrides — defaults match product constants
  MESSAGE_MAX_LENGTH:            z.coerce.number().default(500),
  MESSAGE_COOLDOWN_SECONDS:      z.coerce.number().default(5),
  DUPLICATE_LIMIT:               z.coerce.number().default(2),
  DUPLICATE_MUTE_SECONDS:        z.coerce.number().default(300),
  HISTORY_LIMIT:                 z.coerce.number().default(50),
  UNDER_REVIEW_REPORT_THRESHOLD: z.coerce.number().default(3),
  HIDDEN_REPORT_THRESHOLD:       z.coerce.number().default(5),
  AI_BAN_CONFIDENCE_THRESHOLD:   z.coerce.number().min(0).max(1).default(0.85),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid env:', parsed.error.issues[0]);
  process.exit(1);
}

export const env = parsed.data;
```

### `src/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
```

### `src/lib/ai.ts`

```ts
import OpenAI from 'openai';
import { env } from '../env';

// Cloudflare Workers AI exposes an OpenAI-compatible endpoint.
// Use the standard OpenAI SDK pointed at the Cloudflare base URL.
export const aiClient = new OpenAI({
  apiKey: env.CLOUDFLARE_API_TOKEN,
  baseURL: env.CLOUDFLARE_WORKERS_AI_BASE_URL,
});
```

### `src/server.ts`

```ts
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { env } from './env';
import { registerHealthRoute }     from './http/routes/health.route';
import { registerResetTimeRoute }  from './http/routes/reset-time.route';
import { registerBootstrapRoute }  from './http/routes/bootstrap.route';
import { registerMessagesRoute }   from './http/routes/messages.route';
import { registerModerationRoutes } from './http/routes/moderation.route';
import { registerChatGateway }     from './modules/chat/chat.gateway';
import { startCleanupJob }         from './modules/messages/cleanup';

async function bootstrap() {
  const fastify = Fastify({ logger: true });

  // Public HTTP routes
  registerHealthRoute(fastify);
  registerResetTimeRoute(fastify);
  registerBootstrapRoute(fastify);
  registerMessagesRoute(fastify);

  // Moderator-only HTTP routes
  registerModerationRoutes(fastify);

  // Socket.IO
  const io = new Server(fastify.server, {
    cors: { origin: env.FRONTEND_ORIGIN, methods: ['GET', 'POST'] },
  });

  registerChatGateway(io);
  startCleanupJob(io);

  await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`ephemora-realtime-server running on port ${env.PORT}`);
}

void bootstrap();
```

### HTTP Routes

#### `src/http/routes/health.route.ts`

```ts
import type { FastifyInstance } from 'fastify';

export function registerHealthRoute(fastify: FastifyInstance) {
  fastify.get('/health', async () => ({
    ok: true,
    service: 'ephemora-realtime-server',
  }));
}
```

#### `src/http/routes/reset-time.route.ts`

```ts
import type { FastifyInstance } from 'fastify';
import { getNextReset } from '../../utils/getNextReset';

export function registerResetTimeRoute(fastify: FastifyInstance) {
  fastify.get('/reset-time', async () => {
    const { resetAt } = getNextReset();
    const secondsRemaining = Math.max(
      0,
      Math.floor((new Date(resetAt).getTime() - Date.now()) / 1000),
    );
    return { timezone: 'UTC', resetAt, secondsRemaining };
  });
}
```

#### `src/http/routes/bootstrap.route.ts`

```ts
import type { FastifyInstance } from 'fastify';
import { getNextReset } from '../../utils/getNextReset';
import { env } from '../../env';

export function registerBootstrapRoute(fastify: FastifyInstance) {
  fastify.get('/bootstrap', async () => {
    const { resetAt } = getNextReset();
    const secondsRemaining = Math.max(
      0,
      Math.floor((new Date(resetAt).getTime() - Date.now()) / 1000),
    );

    return {
      app: {
        name: 'Ephemora',
        productLabel: 'Ephemora Chat',
        tagline: 'Say it today. Let it fade tomorrow.',
        description:
          'A daily-reset global chatroom where messages disappear and nicknames change every day.',
      },
      reset: {
        timezone: 'UTC',
        resetAt,
        secondsRemaining,
      },
      realtime: {
        url: env.REALTIME_PUBLIC_URL,
      },
      limits: {
        messageMaxLength:       env.MESSAGE_MAX_LENGTH,
        messageCooldownSeconds: env.MESSAGE_COOLDOWN_SECONDS,
        duplicateLimit:         env.DUPLICATE_LIMIT,
        duplicateMuteSeconds:   env.DUPLICATE_MUTE_SECONDS,
        historyLimit:           env.HISTORY_LIMIT,
      },
      moderation: {
        underReviewReportThreshold: env.UNDER_REVIEW_REPORT_THRESHOLD,
        hiddenReportThreshold:      env.HIDDEN_REPORT_THRESHOLD,
        aiEnabled: true,
      },
    };
  });
}
```

#### `src/http/routes/messages.route.ts`

Unauthenticated, paginated message history for **today only**. Used for visitor read + infinite scroll.

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getMessagesPage } from '../../modules/messages/message.repository';

const QuerySchema = z.object({
  limit:  z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(), // ISO created_at of the oldest item currently loaded
});

export function registerMessagesRoute(fastify: FastifyInstance) {
  fastify.get('/messages', async (req) => {
    const { limit, cursor } = QuerySchema.parse(req.query);
    return getMessagesPage({ limit, cursor });
  });
}
```

#### `src/http/middleware/requireModerator.ts`

```ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifySupabaseToken } from '../../modules/auth/verifySupabaseToken';
import { supabase } from '../../lib/supabase';

export async function requireModerator(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return reply.status(401).send({ error: 'Missing authorization token' });
  }

  const verified = await verifySupabaseToken(token);
  if (!verified) {
    return reply.status(401).send({ error: 'Invalid token' });
  }

  const { data: user } = await supabase
    .from('ephemera_users')
    .select('id, role')
    .eq('supabase_user_id', verified.supabaseUserId)
    .single();

  if (!user || user.role !== 'moderator') {
    return reply.status(403).send({ error: 'Moderator role required' });
  }

  // Attach to request for use in route handlers
  (request as FastifyRequest & { moderatorId: string }).moderatorId = user.id;
}
```

#### `src/http/routes/moderation.route.ts`

```ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireModerator } from '../middleware/requireModerator';
import { getModerationReports, getAiActions, getBannedUsers }
  from '../../modules/moderation/moderation.service';
import { hideMessage, restoreMessage, markReviewed, banUser, unbanUser }
  from '../../modules/moderation/moderation.service';

type ModeratorRequest = FastifyRequest & { moderatorId: string };

export function registerModerationRoutes(fastify: FastifyInstance) {
  // Review Queue — AI failed/uncertain items, high-report messages, under_review messages
  fastify.get('/moderation/reports', { preHandler: requireModerator }, async (req) => {
    return getModerationReports();
  });

  // AI Actions — messages hidden by AI, users banned by AI
  fastify.get('/moderation/ai-actions', { preHandler: requireModerator }, async (req) => {
    return getAiActions();
  });

  // Banned Users
  fastify.get('/moderation/banned-users', { preHandler: requireModerator }, async (req) => {
    return getBannedUsers();
  });

  fastify.post('/moderation/messages/:id/hide', { preHandler: requireModerator }, async (req: ModeratorRequest) => {
    const { id } = req.params as { id: string };
    return hideMessage(id, req.moderatorId, 'moderator');
  });

  fastify.post('/moderation/messages/:id/restore', { preHandler: requireModerator }, async (req: ModeratorRequest) => {
    const { id } = req.params as { id: string };
    return restoreMessage(id, req.moderatorId);
  });

  fastify.post('/moderation/messages/:id/reviewed', { preHandler: requireModerator }, async (req: ModeratorRequest) => {
    const { id } = req.params as { id: string };
    return markReviewed(id, req.moderatorId);
  });

  fastify.post('/moderation/users/:id/ban', { preHandler: requireModerator }, async (req: ModeratorRequest) => {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };
    return banUser(id, req.moderatorId, reason, 'moderator');
  });

  fastify.post('/moderation/users/:id/unban', { preHandler: requireModerator }, async (req: ModeratorRequest) => {
    const { id } = req.params as { id: string };
    return unbanUser(id, req.moderatorId);
  });
}
```

### Core Modules

#### `src/modules/auth/verifySupabaseToken.ts`

```ts
import { supabase } from '../../lib/supabase';

export interface VerifiedUser {
  supabaseUserId: string;
  provider: string | undefined;
}

export async function verifySupabaseToken(token: string): Promise<VerifiedUser | null> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return {
    supabaseUserId: data.user.id,
    provider: data.user.app_metadata?.provider,
  };
}
```

#### `src/modules/identity/nickname.generator.ts`

```ts
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
  type Config,
} from 'unique-names-generator';

/**
 * Generates a deterministic, human-readable nickname from a seed string.
 *
 * Uses unique-names-generator v4 [adjectives, colors, animals] — 50M+ combinations.
 * The `seed` option guarantees identical output for the same (userId + resetDay) pair,
 * including after server restarts. No custom hashing required.
 *
 * Example: "Crimson Hollow Bear", "Silent Blue Otter", "Rapid Green Dolphin"
 */
export function generateNickname(supabaseUserId: string, resetDay: string): string {
  const config: Config = {
    dictionaries: [adjectives, colors, animals],
    separator: ' ',
    style: 'capital',
    length: 3,
    seed: `${supabaseUserId}:${resetDay}`,
  };
  return uniqueNamesGenerator(config);
}
```

#### `src/modules/identity/dailyIdentity.service.ts`

```ts
import { supabase } from '../../lib/supabase';
import { generateNickname } from './nickname.generator';

export interface DailyIdentityResult {
  id: string;
  nickname: string;
  ephemeraUserId: string;
}

export async function getOrCreateDailyIdentity(
  supabaseUserId: string,
  resetDay: string,
  provider?: string,
): Promise<DailyIdentityResult> {
  // Upsert EphemeraUser — update last_seen_at on every connect
  const { data: user, error: userErr } = await supabase
    .from('ephemera_users')
    .upsert(
      { supabase_user_id: supabaseUserId, provider, last_seen_at: new Date().toISOString() },
      { onConflict: 'supabase_user_id', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (userErr || !user) throw new Error(`Failed to upsert ephemera_user: ${userErr?.message}`);

  const nickname = generateNickname(supabaseUserId, resetDay);

  // Upsert DailyIdentity — idempotent; same user+day always produces same nickname
  const { data: identity, error: identityErr } = await supabase
    .from('daily_identities')
    .upsert(
      { user_id: user.id, reset_day: resetDay, nickname },
      { onConflict: 'user_id,reset_day', ignoreDuplicates: true },
    )
    .select('id, nickname')
    .single();

  if (identityErr || !identity) {
    throw new Error(`Failed to upsert daily_identity: ${identityErr?.message}`);
  }

  return { id: identity.id, nickname: identity.nickname, ephemeraUserId: user.id };
}

export async function deleteOldDailyIdentities(currentResetDay: string): Promise<void> {
  // reset_day is stored as "YYYY-MM-DD" UTC, so lexicographic compare is safe.
  const { error } = await supabase
    .from('daily_identities')
    .delete()
    .lt('reset_day', currentResetDay);

  if (error) throw new Error(`Failed to delete old daily_identities: ${error.message}`);
}
```

#### `src/modules/rate-limit/cooldown.service.ts`

```ts
import { env } from '../../env';

interface CooldownEntry {
  lastSentAt: number;
  violations: number;
}

const COOLDOWN_MS = env.MESSAGE_COOLDOWN_SECONDS * 1_000;
const cooldowns = new Map<string, CooldownEntry>();

export function checkCooldown(userId: string): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  const entry = cooldowns.get(userId);

  if (!entry) {
    cooldowns.set(userId, { lastSentAt: now, violations: 0 });
    return { allowed: true, remainingMs: 0 };
  }

  const elapsed = now - entry.lastSentAt;
  if (elapsed < COOLDOWN_MS) {
    entry.violations += 1;
    return { allowed: false, remainingMs: COOLDOWN_MS - elapsed };
  }

  entry.lastSentAt = now;
  entry.violations = 0;
  return { allowed: true, remainingMs: 0 };
}
```

#### `src/modules/rate-limit/duplicate.service.ts`

```ts
import { env } from '../../env';

const DUPLICATE_LIMIT  = env.DUPLICATE_LIMIT;
const MUTE_DURATION_MS = env.DUPLICATE_MUTE_SECONDS * 1_000;

interface DuplicateEntry { lastContent: string; count: number }

const duplicates = new Map<string, DuplicateEntry>();
const mutes      = new Map<string, number>(); // userId → expiresAt

export function isMuted(userId: string): boolean {
  const exp = mutes.get(userId);
  if (!exp) return false;
  if (Date.now() > exp) { mutes.delete(userId); return false; }
  return true;
}

export function getMuteRemainingMs(userId: string): number {
  const exp = mutes.get(userId);
  return exp ? Math.max(0, exp - Date.now()) : 0;
}

export function checkDuplicate(userId: string, content: string): boolean {
  const entry = duplicates.get(userId);

  if (!entry || entry.lastContent !== content) {
    duplicates.set(userId, { lastContent: content, count: 1 });
    return true;
  }

  entry.count += 1;
  if (entry.count > DUPLICATE_LIMIT) {
    mutes.set(userId, Date.now() + MUTE_DURATION_MS);
    duplicates.delete(userId);
    return false;
  }

  return true;
}
```

#### `src/modules/messages/message.repository.ts`

```ts
import { supabase } from '../../lib/supabase';
import { getNextReset } from '../../utils/getNextReset';
import { env } from '../../env';

export interface SaveMessageInput {
  userId: string;
  dailyIdentityId: string;
  content: string;
}

export interface MessageRow {
  id: string;
  content: string;
  nickname: string;   // joined from daily_identities
  created_at: string;
  moderation_status: string;
}

export async function saveMessage(input: SaveMessageInput): Promise<MessageRow> {
  const { resetAt } = getNextReset();

  const { data, error } = await supabase
    .from('ephemera_messages')
    .insert({
      user_id:           input.userId,
      daily_identity_id: input.dailyIdentityId,
      content:           input.content,
      expires_at:        resetAt,
      moderation_status: 'visible',
    })
    .select('id, content, created_at, moderation_status')
    .single();

  if (error || !data) throw new Error(`Failed to save message: ${error?.message}`);

  // Fetch nickname from daily_identity
  const { data: identity } = await supabase
    .from('daily_identities')
    .select('nickname')
    .eq('id', input.dailyIdentityId)
    .single();

  return { ...data, nickname: identity?.nickname ?? 'Anonymous' };
}

export async function getRecentMessages(limit = env.HISTORY_LIMIT): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('ephemera_messages')
    .select(`
      id,
      content,
      created_at,
      moderation_status,
      daily_identities ( nickname )
    `)
    .gt('expires_at', new Date().toISOString())
    .in('moderation_status', ['visible', 'under_review'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch history: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id:                row.id,
    content:           row.content,
    created_at:        row.created_at,
    moderation_status: row.moderation_status,
    nickname:          row.daily_identities?.nickname ?? 'Anonymous',
  }));
}

export interface MessagesPage {
  messages: MessageRow[];
  nextCursor: string | null; // ISO created_at for the next (older) page
}

export async function getMessagesPage(opts: { limit: number; cursor?: string }): Promise<MessagesPage> {
  const nowIso = new Date().toISOString();

  let query = supabase
    .from('ephemera_messages')
    .select(`
      id,
      content,
      created_at,
      moderation_status,
      daily_identities ( nickname )
    `)
    .gt('expires_at', nowIso)
    .in('moderation_status', ['visible', 'under_review'])
    .order('created_at', { ascending: false })
    .limit(opts.limit);

  if (opts.cursor) {
    query = query.lt('created_at', opts.cursor);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch messages page: ${error.message}`);

  const messages = (data ?? []).map((row: any) => ({
    id:                row.id,
    content:           row.content,
    created_at:        row.created_at,
    moderation_status: row.moderation_status,
    nickname:          row.daily_identities?.nickname ?? 'Anonymous',
  }));

  const nextCursor = messages.length ? messages[messages.length - 1]!.created_at : null;
  return { messages, nextCursor };
}

export async function deleteExpiredMessages(): Promise<void> {
  const { error } = await supabase
    .from('ephemera_messages')
    .delete()
    .lte('expires_at', new Date().toISOString());

  if (error) throw new Error(`Failed to delete expired messages: ${error.message}`);
}
```

#### `src/modules/messages/cleanup.ts`

```ts
import cron from 'node-cron';
import type { Server } from 'socket.io';
import { deleteExpiredMessages } from './message.repository';
import { deleteOldDailyIdentities } from '../identity/dailyIdentity.service';
import { clearExpiredBans } from '../moderation/moderation.service';
import { getTodayUTC } from '../../utils/getNextReset';

export function startCleanupJob(io: Server): void {
  // Every 5 minutes: delete expired messages
  cron.schedule('*/5 * * * *', async () => {
    try {
      await deleteExpiredMessages();
      await clearExpiredBans();
    } catch (err) {
      console.error('[cleanup] Failed to delete expired messages:', err);
    }
  }, { timezone: 'UTC' });

  // At 00:00 UTC: broadcast reset event to all connected clients
  cron.schedule('0 0 * * *', async () => {
    try {
      await deleteExpiredMessages(); // Final pass at reset
      await deleteOldDailyIdentities(getTodayUTC());
      await clearExpiredBans();
      io.emit('chat:reset', {});
    } catch (err) {
      console.error('[cleanup] Reset job failed:', err);
    }
  }, { timezone: 'UTC' });
}
```

#### `src/modules/reports/report.service.ts`

```ts
import { supabase } from '../../lib/supabase';
import { env } from '../../env';
import { queueAiModeration } from '../moderation/ai.service';
import { logModerationAction } from '../moderation/moderationAction.repository';

const UNDER_REVIEW = env.UNDER_REVIEW_REPORT_THRESHOLD;
const HIDDEN       = env.HIDDEN_REPORT_THRESHOLD;

export async function saveReport(
  messageId: string,
  reporterUserId: string,
  reason?: string,
): Promise<{
  saved: boolean;
  alreadyReported: boolean;
  moderationStatus?: 'visible' | 'under_review' | 'hidden';
}> {
  const { error: insertErr } = await supabase
    .from('ephemera_reports')
    .insert({ message_id: messageId, reporter_user_id: reporterUserId, reason });

  if (insertErr?.code === '23505') return { saved: false, alreadyReported: true };
  if (insertErr) throw new Error(`Failed to save report: ${insertErr.message}`);

  // Atomic report_count increment + threshold moderation.
  // Uses a Postgres RPC to avoid lost updates under concurrency.
  const { data: updated, error: rpcErr } = await supabase
    .rpc('ephemora_increment_report_count', {
      p_message_id: messageId,
      p_under_review_threshold: UNDER_REVIEW,
      p_hidden_threshold: HIDDEN,
    })
    .single();

  if (rpcErr) throw new Error(`Failed to increment report_count: ${rpcErr.message}`);
  if (!updated) return { saved: true, alreadyReported: false };

  // If threshold auto-hid the message, log it.
  if (updated.moderation_status === 'hidden') {
    await logModerationAction({
      targetType: 'message',
      targetId:   messageId,
      action:     'hide_message',
      source:     'threshold',
      reason:     `Auto-hidden: ${updated.report_count} reports`,
    });
  }

  // Avoid duplicate AI scans: "claim" the scan by flipping not_required → pending.
  const { data: claimed } = await supabase
    .from('ephemera_messages')
    .update({ ai_moderation_status: 'pending' })
    .eq('id', messageId)
    .eq('ai_moderation_status', 'not_required')
    .select('id')
    .maybeSingle();

  if (claimed) {
    void queueAiModeration(messageId, updated.content, updated.user_id);
  }

  return {
    saved: true,
    alreadyReported: false,
    moderationStatus: updated.moderation_status,
  };
}
```

#### `src/modules/chat/chat.types.ts`

```ts
export interface SocketUser {
  supabaseUserId: string;
  ephemeraUserId: string;
  dailyIdentityId: string;
  nickname: string;
}

// Client → Server events
export interface MessageSendPayload   { content: string }
export interface MessageReportPayload { messageId: string; reason?: string }

// Server → Client events
export interface MessageNewPayload {
  id: string;
  content: string;
  nickname: string;
  createdAt: string;
  moderationStatus: 'visible' | 'under_review' | 'hidden';
}

export interface MessageModeratedPayload {
  messageId: string;
  moderationStatus: 'visible' | 'under_review' | 'hidden';
}

export interface UserIdentityPayload  { nickname: string }
export interface UserCooldownPayload  { remainingMs: number }
export interface UserMutedPayload     { muteRemainingMs: number }
export interface ReportAckPayload     { ok: boolean; error?: string }
export interface PresencePayload      { count: number }
```

#### `src/modules/chat/chat.gateway.ts`

```ts
import { Server, Socket } from 'socket.io';
import { verifySupabaseToken }     from '../auth/verifySupabaseToken';
import { getOrCreateDailyIdentity } from '../identity/dailyIdentity.service';
import { handleMessageSend }       from './chat.service';
import { saveReport }              from '../reports/report.service';
import { getTodayUTC }             from '../../utils/getNextReset';
import type {
  SocketUser,
  MessageSendPayload,
  MessageReportPayload,
  ReportAckPayload,
} from './chat.types';

declare module 'socket.io' {
  interface Socket { data: { user?: SocketUser } }
}

export function registerChatGateway(io: Server): void {
  // Auth middleware — runs on every new connection before 'connection' event
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    // Visitor mode: allow connection without a token (read-only).
    if (!token) return next();

    const verified = await verifySupabaseToken(token);
    if (!verified) return next(new Error('auth:invalid_token'));

    const { data: dbUser } = await supabase
      .from('ephemera_users')
      .select('banned_until, status')
      .eq('supabase_user_id', verified.supabaseUserId)
      .single();

    if (dbUser?.status === 'banned' && dbUser.banned_until) {
      if (new Date(dbUser.banned_until) > new Date()) {
        return next(new Error('auth:banned'));
      }
    }

    try {
      const identity = await getOrCreateDailyIdentity(
        verified.supabaseUserId,
        getTodayUTC(),
        verified.provider,
      );
      socket.data.user = {
        supabaseUserId:  verified.supabaseUserId,
        ephemeraUserId:  identity.ephemeraUserId,
        dailyIdentityId: identity.id,
        nickname:        identity.nickname,
      };
      next();
    } catch (err) {
      console.error('[gateway] Identity error:', err);
      next(new Error('auth:identity_error'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;

    // Emit user's own identity (authenticated sockets only)
    if (user) socket.emit('user:identity', { nickname: user.nickname });

    // Emit current-day presence count
    io.emit('room:presence', { count: io.sockets.sockets.size });

    // Handle message send
    socket.on('message:send', async (payload: MessageSendPayload) => {
      if (!user) {
        socket.emit('system:error', { code: 'auth_required' });
        return;
      }
      await handleMessageSend(io, socket, user, payload);
    });

    // Handle message report — uses Socket.IO acknowledgement callback
    socket.on('message:report', async (
      payload: MessageReportPayload,
      callback: (ack: ReportAckPayload) => void,
    ) => {
      try {
        if (!user) return callback({ ok: false, error: 'auth_required' });
        const result = await saveReport(payload.messageId, user.ephemeraUserId, payload.reason);
        if (result.alreadyReported) {
          callback({ ok: false, error: 'already_reported' });
        } else {
          if (result.moderationStatus && result.moderationStatus !== 'visible') {
            io.emit('message:moderated', {
              messageId: payload.messageId,
              moderationStatus: result.moderationStatus,
            });
          }
          callback({ ok: true });
        }
      } catch {
        callback({ ok: false, error: 'report_failed' });
      }
    });

    // Update presence count on disconnect
    socket.on('disconnect', () => {
      io.emit('room:presence', { count: io.sockets.sockets.size });
    });
  });
}
```

> Note: the `supabase` import is needed in `chat.gateway.ts` for the ban check. Add `import { supabase } from '../../lib/supabase';` at the top.

#### `src/modules/chat/chat.service.ts`

```ts
import { Server, Socket } from 'socket.io';
import type { SocketUser, MessageSendPayload, MessageNewPayload } from './chat.types';
import { checkCooldown }                      from '../rate-limit/cooldown.service';
import { isMuted, getMuteRemainingMs, checkDuplicate } from '../rate-limit/duplicate.service';
import { saveMessage }                        from '../messages/message.repository';
import { normalizeMessage }                   from '../../utils/normalizeMessage';
import { sanitizeMessage }                    from '../../utils/sanitizeMessage';
import { supabase }                           from '../../lib/supabase';
import { env }                               from '../../env';

export async function handleMessageSend(
  io: Server,
  socket: Socket,
  user: SocketUser,
  payload: MessageSendPayload,
): Promise<void> {
  // 1. Re-verify ban (in case ban was applied since connect)
  const { data: dbUser } = await supabase
    .from('ephemera_users')
    .select('banned_until')
    .eq('id', user.ephemeraUserId)
    .single();

  if (dbUser?.banned_until && new Date(dbUser.banned_until) > new Date()) {
    socket.emit('system:error', { code: 'banned' });
    return;
  }

  // 2. Check mute
  if (isMuted(user.ephemeraUserId)) {
    socket.emit('user:muted', { muteRemainingMs: getMuteRemainingMs(user.ephemeraUserId) });
    return;
  }

  // 3. Check cooldown
  const cooldown = checkCooldown(user.ephemeraUserId);
  if (!cooldown.allowed) {
    socket.emit('user:cooldown', { remainingMs: cooldown.remainingMs });
    return;
  }

  // 4. Sanitize + normalize
  const normalized = normalizeMessage(sanitizeMessage(payload.content ?? ''));

  // 5. Length check
  if (normalized.length === 0 || normalized.length > env.MESSAGE_MAX_LENGTH) {
    socket.emit('system:error', { code: 'invalid_message_length' });
    return;
  }

  // 6. Duplicate check
  if (!checkDuplicate(user.ephemeraUserId, normalized)) {
    socket.emit('user:muted', { muteRemainingMs: getMuteRemainingMs(user.ephemeraUserId) });
    return;
  }

  // 7. Persist
  const saved = await saveMessage({
    userId:          user.ephemeraUserId,
    dailyIdentityId: user.dailyIdentityId,
    content:         normalized,
  });

  // 8. Broadcast to all connected clients
  const broadcast: MessageNewPayload = {
    id:               saved.id,
    content:          saved.content,
    nickname:         saved.nickname,
    createdAt:        saved.created_at,
    moderationStatus: 'visible',
  };
  io.emit('message:new', broadcast);
}
```

### Socket.IO Event Contract (Complete)

Message history (including visitor infinite scroll) is fetched over HTTP via `GET /messages`. Socket.IO is used for live push updates only.

| Direction | Event | Payload | Notes |
|-----------|-------|---------|-------|
| C → S | `message:send` | `{ content: string }` | Authenticated sockets only |
| C → S | `message:report` | `{ messageId, reason? }` | Authenticated sockets only; uses acknowledgement callback |
| S → C | `user:identity` | `{ nickname: string }` | Authenticated sockets only |
| S → C | `message:new` | `MessageNewPayload` | Broadcast to all clients |
| S → C | `message:moderated` | `{ messageId: string, moderationStatus: 'visible' \\| 'under_review' \\| 'hidden' }` | Broadcast on threshold/AI/mod actions |
| S → C | `user:cooldown` | `{ remainingMs: number }` | Sender only |
| S → C | `user:muted` | `{ muteRemainingMs: number }` | Sender only |
| S → C | `chat:reset` | `{}` | Broadcast at 00:00 UTC |
| S → C | `room:presence` | `{ count: number }` | Broadcast on connect/disconnect |
| S → C | `system:error` | `{ code: string }` | Sender only |
| report ack | callback | `{ ok: boolean; error?: string }` | Acknowledgement on `message:report` |

### Render Environment Variables

```env
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://ephemora.mkgpdev.xyz
REALTIME_PUBLIC_URL=https://realtime.mkgpdev.xyz
SUPABASE_URL=<from Supabase project settings>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase project settings — never expose to frontend>
CLOUDFLARE_ACCOUNT_ID=<from Cloudflare dashboard>
CLOUDFLARE_API_TOKEN=<from Cloudflare dashboard>
CLOUDFLARE_WORKERS_AI_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<account_id>/ai/v1

# Optional overrides
MESSAGE_MAX_LENGTH=500
MESSAGE_COOLDOWN_SECONDS=5
DUPLICATE_LIMIT=2
DUPLICATE_MUTE_SECONDS=300
HISTORY_LIMIT=50
UNDER_REVIEW_REPORT_THRESHOLD=3
HIDDEN_REPORT_THRESHOLD=5
AI_BAN_CONFIDENCE_THRESHOLD=0.85
```

### `render.yaml`

```yaml
services:
  - type: web
    name: ephemora-realtime-server
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
      - key: FRONTEND_ORIGIN
        value: https://ephemora.mkgpdev.xyz
      - key: REALTIME_PUBLIC_URL
        value: https://realtime.mkgpdev.xyz
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: CLOUDFLARE_ACCOUNT_ID
        sync: false
      - key: CLOUDFLARE_API_TOKEN
        sync: false
      - key: CLOUDFLARE_WORKERS_AI_BASE_URL
        sync: false
```

---

## 8. AI Moderation — Cloudflare Workers AI

### `src/modules/moderation/ai.service.ts`

```ts
import { aiClient } from '../../lib/ai';
import { supabase } from '../../lib/supabase';
import { logModerationAction } from './moderationAction.repository';
import { env } from '../../env';

type AiVerdict = 'safe' | 'harmful' | 'uncertain';

interface AiModerationResult {
  verdict: AiVerdict;
  confidence: number;
  reason: string;
}

const SYSTEM_PROMPT = `
You are a moderation AI for Ephemora, an anonymous daily-reset chatroom.
Evaluate the following chat message for harmful content.

Respond with a JSON object only, no markdown, no preamble:
{
  "verdict": "safe" | "harmful" | "uncertain",
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation"
}

Classify as "harmful" if the message contains: hate speech, targeted harassment,
threats of violence, explicit sexual content, self-harm encouragement,
or personally identifiable information shared maliciously.

Classify as "uncertain" if the context is ambiguous or the content is borderline.
Classify as "safe" otherwise.
`.trim();

async function callAi(content: string): Promise<AiModerationResult> {
  const response = await aiClient.chat.completions.create({
    model: '@cf/openai/gpt-oss-20b',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Message to evaluate: "${content}"` },
    ],
    max_tokens: 150,
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content ?? '';

  // Strip any accidental markdown fences before parsing
  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean) as AiModerationResult;

  if (!['safe', 'harmful', 'uncertain'].includes(parsed.verdict)) {
    throw new Error(`Unexpected verdict: ${parsed.verdict}`);
  }

  return {
    verdict:    parsed.verdict,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence))),
    reason:     parsed.reason ?? '',
  };
}

/**
 * Orchestrates AI moderation for a reported message.
 * Called asynchronously — never blocks the report acknowledgement to the user.
 *
 * AI flow:
 *   safe     → update message ai_moderation_status, no action
 *   harmful  → hide message + optionally ban user until next reset
 *   uncertain → send to manual review queue
 *   error    → send to manual review queue
 */
export async function queueAiModeration(
  messageId: string,
  content: string,
  userId: string,
): Promise<void> {
  // Mark as pending
  await supabase
    .from('ephemera_messages')
    .update({ ai_moderation_status: 'pending' })
    .eq('id', messageId);

  let result: AiModerationResult;

  try {
    result = await callAi(content);
  } catch (err) {
    console.error('[ai] Moderation call failed:', err);

    const errMsg = err instanceof Error ? err.message : '';
    const status = /rate limit|quota|429|402/i.test(errMsg) ? 'limited' : 'failed';

    // AI failed → send to manual review
    await supabase
      .from('ephemera_messages')
      .update({
        ai_moderation_status: status,
        manual_review_status: 'pending',
        ai_reason: errMsg || 'Unknown AI error',
        ai_moderated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    await logModerationAction({
      targetType: 'message',
      targetId:   messageId,
      action:     'queue_review',
      source:     'ai',
      reason:     'AI moderation failed — sent to manual review',
    });

    return;
  }

  // Persist AI decision
  await supabase
    .from('ephemera_messages')
    .update({
      ai_moderation_status: result.verdict,
      ai_verdict:           result.verdict,
      ai_confidence:        result.confidence,
      ai_reason:            result.reason,
      ai_moderated_at:      new Date().toISOString(),
      ...(result.verdict === 'uncertain' ? { manual_review_status: 'pending' } : {}),
      ...(result.verdict === 'harmful'   ? {
        moderation_status: 'hidden',
        hidden_by_source:  'ai',
        hidden_at:         new Date().toISOString(),
      } : {}),
    })
    .eq('id', messageId);

  if (result.verdict === 'harmful') {
    await logModerationAction({
      targetType: 'message',
      targetId:   messageId,
      action:     'hide_message',
      source:     'ai',
      reason:     result.reason,
      metadata:   { confidence: result.confidence },
    });

    // For high-confidence harmful content, temporarily ban the user until next reset
    if (result.confidence >= env.AI_BAN_CONFIDENCE_THRESHOLD) {
      await applyTemporaryBan(userId, messageId, result.reason);
    }
  } else if (result.verdict === 'uncertain') {
    await logModerationAction({
      targetType: 'message',
      targetId:   messageId,
      action:     'queue_review',
      source:     'ai',
      reason:     `AI uncertain (${result.confidence.toFixed(2)}) — queued for manual review`,
    });
  }
}

async function applyTemporaryBan(
  userId: string,
  messageId: string,
  reason: string,
): Promise<void> {
  // Ban until next UTC midnight
  const bannedUntil = new Date();
  bannedUntil.setUTCHours(24, 0, 0, 0);

  await supabase
    .from('ephemera_users')
    .update({
      status:      'banned',
      banned_until: bannedUntil.toISOString(),
      ban_reason:   reason,
      ban_source:   'ai',
      banned_at:    new Date().toISOString(),
    })
    .eq('id', userId);

  await logModerationAction({
    targetType: 'user',
    targetId:   userId,
    action:     'ban_user',
    source:     'ai',
    reason,
    metadata:   { triggeredByMessageId: messageId, bannedUntil: bannedUntil.toISOString() },
  });
}
```

### `src/modules/moderation/moderationAction.repository.ts`

```ts
import { supabase } from '../../lib/supabase';

export interface LogActionInput {
  targetType:    'message' | 'user';
  targetId:      string;
  action:        string;
  source:        string;
  actorUserId?:  string;
  reason?:       string;
  metadata?:     Record<string, unknown>;
}

export async function logModerationAction(input: LogActionInput): Promise<void> {
  const { error } = await supabase.from('moderation_actions').insert({
    target_type:   input.targetType,
    target_id:     input.targetId,
    action:        input.action,
    source:        input.source,
    actor_user_id: input.actorUserId ?? null,
    reason:        input.reason ?? null,
    metadata:      input.metadata ?? null,
  });

  if (error) {
    console.error('[moderation] Failed to log action:', error.message);
  }
}
```

### `src/modules/moderation/moderation.service.ts`

```ts
import { supabase } from '../../lib/supabase';
import { logModerationAction } from './moderationAction.repository';
import { getNextReset } from '../../utils/getNextReset';

// ── Queries for moderation board ─────────────────────────────────────────────

export async function getModerationReports() {
  const { data } = await supabase
    .from('ephemera_messages')
    .select(`
      id, content, report_count, moderation_status,
      ai_moderation_status, ai_verdict, ai_confidence, ai_reason,
      manual_review_status, created_at,
      daily_identities ( nickname )
    `)
    .or(
      'manual_review_status.eq.pending,' +
      'moderation_status.eq.under_review,' +
      'ai_moderation_status.eq.failed,' +
      'ai_moderation_status.eq.uncertain,' +
      'ai_moderation_status.eq.limited'
    )
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getAiActions() {
  const { data } = await supabase
    .from('moderation_actions')
    .select('*')
    .eq('source', 'ai')
    .order('created_at', { ascending: false })
    .limit(100);

  return data ?? [];
}

export async function getBannedUsers() {
  const { data } = await supabase
    .from('ephemera_users')
    .select('id, supabase_user_id, status, banned_until, ban_reason, ban_source, banned_at')
    .eq('status', 'banned')
    .order('banned_at', { ascending: false });

  return data ?? [];
}

// ── Moderator actions ─────────────────────────────────────────────────────────

export async function hideMessage(
  messageId: string,
  actorUserId: string,
  source: 'moderator' | 'ai' = 'moderator',
) {
  await supabase
    .from('ephemera_messages')
    .update({
      moderation_status: 'hidden',
      hidden_by_source:  source,
      hidden_at:         new Date().toISOString(),
    })
    .eq('id', messageId);

  await logModerationAction({
    targetType:   'message',
    targetId:     messageId,
    action:       'hide_message',
    source,
    actorUserId,
  });

  return { ok: true };
}

export async function restoreMessage(messageId: string, actorUserId: string) {
  await supabase
    .from('ephemera_messages')
    .update({
      moderation_status:    'visible',
      hidden_by_source:     null,
      hidden_at:            null,
      manual_review_status: 'reviewed',
    })
    .eq('id', messageId);

  await logModerationAction({
    targetType:  'message',
    targetId:    messageId,
    action:      'restore_message',
    source:      'moderator',
    actorUserId,
  });

  return { ok: true };
}

export async function markReviewed(messageId: string, actorUserId: string) {
  await supabase
    .from('ephemera_messages')
    .update({ manual_review_status: 'reviewed' })
    .eq('id', messageId);

  await logModerationAction({
    targetType:  'message',
    targetId:    messageId,
    action:      'mark_reviewed',
    source:      'moderator',
    actorUserId,
  });

  return { ok: true };
}

export async function banUser(
  userId: string,
  actorUserId: string,
  reason: string | undefined,
  source: 'moderator' | 'ai' = 'moderator',
) {
  const { resetAt } = getNextReset();

  await supabase
    .from('ephemera_users')
    .update({
      status:       'banned',
      banned_until:  resetAt,
      ban_reason:    reason ?? 'Manual moderator ban',
      ban_source:    source,
      banned_at:     new Date().toISOString(),
    })
    .eq('id', userId);

  await logModerationAction({
    targetType:  'user',
    targetId:    userId,
    action:      'ban_user',
    source,
    actorUserId,
    reason:      reason ?? 'Manual moderator ban',
    metadata:    { bannedUntil: resetAt },
  });

  return { ok: true };
}

export async function unbanUser(userId: string, actorUserId: string) {
  await supabase
    .from('ephemera_users')
    .update({
      status:      'active',
      banned_until: null,
      ban_reason:   null,
      ban_source:   null,
      banned_at:    null,
    })
    .eq('id', userId);

  await logModerationAction({
    targetType:  'user',
    targetId:    userId,
    action:      'unban_user',
    source:      'moderator',
    actorUserId,
  });

  return { ok: true };
}

export async function clearExpiredBans(): Promise<void> {
  // banned_until is the source of truth; status is cleared when the temporary ban expires.
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('ephemera_users')
    .update({
      status:       'active',
      banned_until: null,
      ban_reason:   null,
      ban_source:   null,
      banned_at:    null,
    })
    .eq('status', 'banned')
    .lte('banned_until', nowIso);

  if (error) console.error('[moderation] Failed to clear expired bans:', error.message);
}
```

---

## 9. Moderation Board

Frontend route: `/moderation`
Access: `EphemeraUser.role = 'moderator'` only, verified server-side by `requireModerator` middleware.

### Frontend folder additions

```
src/pages/
  ModerationPage.tsx               # /moderation — tabs: Review Queue | AI Actions | Banned Users

src/components/moderation/
  ModerationShell.tsx              # Layout wrapper with auth gate
  ReviewQueueTab.tsx               # AI failed/uncertain, high-report, under_review messages
  AiActionsTab.tsx                 # Messages hidden by AI, AI bans
  BannedUsersTab.tsx               # Current bans with unban action
  ModerationMessageCard.tsx        # Reusable card: message content + action buttons
  ModerationUserRow.tsx            # Reusable row: user + ban info + unban button

src/hooks/
  useModerator.ts                  # useQuery(['session']) → checks role = 'moderator'
  useModerationReports.ts          # useQuery(['moderation', 'reports'])
  useModerationAiActions.ts        # useQuery(['moderation', 'ai-actions'])
  useBannedUsers.ts                # useQuery(['moderation', 'banned-users'])
  useModerationActions.ts          # useMutation for hide/restore/reviewed/ban/unban

src/lib/
  moderationApi.ts                 # fetch wrappers for all /moderation/* HTTP endpoints
```

### `src/lib/moderationApi.ts`

```ts
const BASE = import.meta.env.VITE_REALTIME_URL;

async function moderationFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  const token   = session?.access_token ?? '';

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) throw new Error(`Moderation API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const moderationApi = {
  getReports:    ()           => moderationFetch('/moderation/reports'),
  getAiActions:  ()           => moderationFetch('/moderation/ai-actions'),
  getBannedUsers:()           => moderationFetch('/moderation/banned-users'),
  hideMessage:   (id: string) => moderationFetch(`/moderation/messages/${id}/hide`,    { method: 'POST' }),
  restoreMessage:(id: string) => moderationFetch(`/moderation/messages/${id}/restore`, { method: 'POST' }),
  markReviewed:  (id: string) => moderationFetch(`/moderation/messages/${id}/reviewed`,{ method: 'POST' }),
  banUser:       (id: string, reason?: string) =>
    moderationFetch(`/moderation/users/${id}/ban`,   { method: 'POST', body: JSON.stringify({ reason }) }),
  unbanUser:     (id: string) => moderationFetch(`/moderation/users/${id}/unban`,   { method: 'POST' }),
};
```

> `supabase` is imported from `../lib/supabase` in `moderationApi.ts`.

### `src/pages/ModerationPage.tsx` — structural outline

```tsx
import { Tabs } from '@mantine/core';
import { useModerator } from '../hooks/useModerator';
import ReviewQueueTab  from '../components/moderation/ReviewQueueTab';
import AiActionsTab    from '../components/moderation/AiActionsTab';
import BannedUsersTab  from '../components/moderation/BannedUsersTab';

export default function ModerationPage() {
  const { isModerator, isLoading } = useModerator();

  if (isLoading) return <div>Checking access…</div>;
  if (!isModerator) return <div>403 — Moderator access required.</div>;

  return (
    <Tabs defaultValue="review">
      <Tabs.List>
        <Tabs.Tab value="review">Review Queue</Tabs.Tab>
        <Tabs.Tab value="ai">AI Actions</Tabs.Tab>
        <Tabs.Tab value="banned">Banned Users</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="review"><ReviewQueueTab /></Tabs.Panel>
      <Tabs.Panel value="ai"><AiActionsTab /></Tabs.Panel>
      <Tabs.Panel value="banned"><BannedUsersTab /></Tabs.Panel>
    </Tabs>
  );
}
```

### `src/hooks/useModerator.ts`

```ts
import { useSession } from './useSession';
import { useQuery }   from '@tanstack/react-query';
import { moderationApi } from '../lib/moderationApi';

export function useModerator() {
  const { data: session, isLoading: sessionLoading } = useSession();

  // Attempt to fetch the review queue; 403 means not a moderator
  const { isError, isLoading } = useQuery({
    queryKey: ['moderation', 'access-check'],
    queryFn:  () => moderationApi.getReports(),
    enabled:  !!session,
    retry:    false,
    staleTime: 30_000,
  });

  return {
    isModerator: !isError && !!session,
    isLoading:   sessionLoading || isLoading,
  };
}
```

### Moderation HTTP API contract

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/moderation/reports`           | Bearer + `role=moderator` | Review queue items |
| `GET`  | `/moderation/ai-actions`        | Bearer + `role=moderator` | AI decisions log |
| `GET`  | `/moderation/banned-users`      | Bearer + `role=moderator` | Current banned users |
| `POST` | `/moderation/messages/:id/hide`     | Bearer + `role=moderator` | Hide a message |
| `POST` | `/moderation/messages/:id/restore`  | Bearer + `role=moderator` | Restore a hidden message |
| `POST` | `/moderation/messages/:id/reviewed` | Bearer + `role=moderator` | Mark reviewed |
| `POST` | `/moderation/users/:id/ban`         | Bearer + `role=moderator` | Ban user until reset |
| `POST` | `/moderation/users/:id/unban`       | Bearer + `role=moderator` | Unban user |

---

## 10. Frontend — React + Vite + TypeScript

### Scaffold

```bash
npm create vite@latest ephemora-web -- --template react-ts
cd ephemora-web
npm install
```

Do not remove `babel-plugin-react-compiler` from `vite.config.ts`.

### Package install

```bash
# UI
npm install @mantine/core @mantine/hooks @mantine/notifications @mantine/modals

# Fonts — variable weight via Fontsource
npm install @fontsource-variable/geist @fontsource-variable/geist-mono

# Auth
npm install @supabase/supabase-js

# Realtime
npm install socket.io-client

# Routing
npm install react-router-dom

# Server state
npm install @tanstack/react-query

# Utilities
npm install clsx

# Dev types
npm install -D @types/node
```

### Frontend Environment Variables

```env
VITE_REALTIME_URL=https://realtime.mkgpdev.xyz
VITE_SUPABASE_URL=<from Supabase project settings>
VITE_SUPABASE_ANON_KEY=<from Supabase project settings>
```

Local development:

```env
VITE_REALTIME_URL=http://localhost:4000
VITE_SUPABASE_URL=<from Supabase project settings>
VITE_SUPABASE_ANON_KEY=<from Supabase project settings>
```

> `VITE_API_URL` and `VITE_SOCKET_URL` are removed — `VITE_REALTIME_URL` serves both HTTP bootstrap and Socket.IO.

### Folder structure

```
ephemora-web/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── main.tsx                       # Providers: Mantine + QueryClient + BrowserRouter
│   ├── App.tsx                        # Route definitions (+ /moderation)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ChatShell.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── chat/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx      # Renders pending/visible/under_review/hidden states
│   │   │   └── MessageInput.tsx       # Character count + cooldown bar
│   │   │
│   │   ├── auth/
│   │   │   ├── JoinButton.tsx         # Google + GitHub OAuth buttons
│   │   │   └── UserBadge.tsx
│   │   │
│   │   ├── status/
│   │   │   ├── ResetCountdown.tsx
│   │   │   ├── ConnectionStatus.tsx
│   │   │   └── PresenceCounter.tsx    # "N people here" from room:presence event
│   │   │
│   │   ├── modals/
│   │   │   ├── ReportMessageModal.tsx
│   │   │   ├── AboutModal.tsx
│   │   │   ├── PrivacyModal.tsx
│   │   │   └── TermsModal.tsx
│   │   │
│   │   └── moderation/
│   │       ├── ModerationShell.tsx
│   │       ├── ReviewQueueTab.tsx
│   │       ├── AiActionsTab.tsx
│   │       ├── BannedUsersTab.tsx
│   │       ├── ModerationMessageCard.tsx
│   │       └── ModerationUserRow.tsx
│   │
│   ├── hooks/
│   │   ├── useBootstrap.ts            # useQuery → GET /bootstrap
│   │   ├── useSession.ts              # useQuery → supabase.auth.getSession()
│   │   ├── useAuth.ts                 # signIn/signOut + session
│   │   ├── useSocket.ts               # Socket.IO lifecycle
│   │   ├── useMessageHistory.ts       # useInfiniteQuery → GET /messages (today only)
│   │   ├── useMessages.ts             # useState live messages (Socket.IO pushed state)
│   │   ├── useCountdown.ts            # Seconds ticker from bootstrap resetAt
│   │   ├── useReportMessage.ts        # useMutation → socket.emit('message:report', …, ack)
│   │   ├── useModerator.ts            # Role check
│   │   ├── useModerationReports.ts    # useQuery → GET /moderation/reports
│   │   ├── useModerationAiActions.ts  # useQuery → GET /moderation/ai-actions
│   │   ├── useBannedUsers.ts          # useQuery → GET /moderation/banned-users
│   │   └── useModerationActions.ts    # useMutation for all moderation POST actions
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── socket.ts                  # io() factory using VITE_REALTIME_URL
│   │   ├── api.ts                     # fetch wrapper for VITE_REALTIME_URL HTTP endpoints
│   │   ├── moderationApi.ts
│   │   ├── queryClient.ts
│   │   └── theme.ts
│   │
│   ├── pages/
│   │   ├── ChatPage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── PrivacyPage.tsx
│   │   ├── TermsPage.tsx
│   │   └── ModerationPage.tsx
│   │
│   ├── types/
│   │   ├── bootstrap.ts
│   │   ├── chat.ts
│   │   └── moderation.ts
│   │
│   └── utils/
│       ├── formatTime.ts
│       └── getTodayUTC.ts
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── .env.local
```

### `src/lib/socket.ts` — updated for `VITE_REALTIME_URL`

```ts
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(import.meta.env.VITE_REALTIME_URL, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

### `src/lib/api.ts` — updated for `VITE_REALTIME_URL`

```ts
const BASE = import.meta.env.VITE_REALTIME_URL;

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}
```

### `src/types/bootstrap.ts` — updated shape

```ts
export interface BootstrapResponse {
  app: {
    name: string;
    productLabel: string;
    tagline: string;
    description: string;
  };
  reset: {
    timezone: 'UTC';
    resetAt: string;
    secondsRemaining: number;
  };
  realtime: {
    url: string;
  };
  limits: {
    messageMaxLength: number;
    messageCooldownSeconds: number;
    duplicateLimit: number;
    duplicateMuteSeconds: number;
    historyLimit: number;
  };
  moderation: {
    underReviewReportThreshold: number;
    hiddenReportThreshold: number;
    aiEnabled: boolean;
  };
}
```

### `src/types/moderation.ts`

```ts
export interface ModerationReport {
  id: string;
  content: string;
  report_count: number;
  moderation_status: string;
  ai_moderation_status: string;
  ai_verdict: string | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  manual_review_status: string;
  created_at: string;
  daily_identities: { nickname: string } | null;
}

export interface ModerationAction {
  id: string;
  target_type: string;
  target_id: string;
  action: string;
  source: string;
  actor_user_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface BannedUser {
  id: string;
  supabase_user_id: string;
  status: string;
  banned_until: string | null;
  ban_reason: string | null;
  ban_source: string | null;
  banned_at: string | null;
}
```

### `src/App.tsx` — updated with `/moderation`

```tsx
import { Routes, Route } from 'react-router-dom';
import ChatPage        from './pages/ChatPage';
import AboutPage       from './pages/AboutPage';
import PrivacyPage     from './pages/PrivacyPage';
import TermsPage       from './pages/TermsPage';
import ModerationPage  from './pages/ModerationPage';

export default function App() {
  return (
    <Routes>
      <Route path="/"            element={<ChatPage />} />
      <Route path="/about"       element={<AboutPage />} />
      <Route path="/privacy"     element={<PrivacyPage />} />
      <Route path="/terms"       element={<TermsPage />} />
      <Route path="/moderation"  element={<ModerationPage />} />
    </Routes>
  );
}
```

### `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { mantineTheme } from './lib/theme';
import App from './App';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MantineProvider theme={mantineTheme} defaultColorScheme="light">
          <Notifications />
          <ModalsProvider>
            <App />
          </ModalsProvider>
        </MantineProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

### `src/lib/theme.ts` — Mantine theme from `DESIGN.md`

```ts
import { createTheme } from '@mantine/core';

export const mantineTheme = createTheme({
  fontFamily:          "'Geist Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'Geist Mono Variable', monospace",
  defaultRadius: 0,
  primaryColor: 'green',
  colors: {
    green: [
      '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80',
      '#10B981', '#00DC82', '#059669', '#047857', '#065f46',
    ],
  },
  components: {
    Button:    { defaultProps: { radius: '1.2px' } },
    TextInput: { defaultProps: { radius: 0 } },
    Textarea:  { defaultProps: { radius: 0 } },
  },
});
```

---

## 11. Reset & Nickname Logic

### `src/utils/getNextReset.ts` (Render backend)

```ts
export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export interface ResetInfo {
  resetAt:  string;  // ISO 8601 next UTC midnight
  resetDay: string;  // "YYYY-MM-DD" current UTC day
}

export function getNextReset(now = new Date()): ResetInfo {
  const resetAt = new Date(now);
  resetAt.setUTCHours(24, 0, 0, 0);
  return {
    resetAt:  resetAt.toISOString(),
    resetDay: now.toISOString().slice(0, 10),
  };
}
```

### Nickname determinism guarantee

`unique-names-generator` v4's `seed` option accepts a string. Passing `"${supabaseUserId}:${resetDay}"` guarantees:
- Same user + same reset day → same nickname across all server restarts
- Same user + different reset day → different nickname
- 50M+ combinations from `[adjectives, colors, animals]` — negligible collision probability

---

## 12. Stage 1 Improvement Proposals

### 12.1 — Optimistic message rendering ✅ Adopted

When a user sends a message, add it to the local list immediately with `pending` status. On `message:new` with matching content, replace it with the confirmed server record. On `user:cooldown`, `user:muted`, or `system:error`, remove the pending entry and show a Mantine notification. Zero backend changes.

### 12.2 — Chat history + infinite scroll ✅ Adopted as core Stage 1

Chat history is fetched over HTTP via `GET /messages` using TanStack Query (`useInfiniteQuery`).

- On page load: fetch the newest 50 non-hidden, non-expired messages for today.
- On scroll-up: fetch older pages within the same day.

Socket.IO is used for live push only (no `chat:history` event).

### 12.3 — Online presence counter ✅ Adopted as core Stage 1

`room:presence` is now a core event. The server emits `{ count: number }` on every connect and disconnect. The frontend displays "N people here" near the countdown via `PresenceCounter.tsx`.

### 12.4 — Mantine Notifications for system feedback ✅ Recommended

Register all socket feedback events in `useSocket.ts` and surface them via `@mantine/notifications`:

| Socket event | Notification |
|---|---|
| `user:cooldown` | Warning: "Slow down — wait Xs." |
| `user:muted` | Error: "Muted for 5 minutes." |
| `system:error { code: 'banned' }` | Error: "You are temporarily banned." |
| `system:error { code: 'invalid_message_length' }` | Warning: "Message too long." |
| Report ack `ok: true` | Success: "Report submitted." |
| Report ack `error: 'already_reported'` | Info: "Already reported." |

### 12.5 — Message character count indicator ✅ Recommended

In `MessageInput.tsx`, display a live character count (e.g. `"342 / 500"`) that turns red above 400. Disable the Send button when length is 0 or > 500. Zero backend changes.

### 12.6 — Render cold-start awareness ✅ Recommended

If `connect_error` fires within 5 seconds of page load, show: *"The room is waking up… give it a moment."* After 15 seconds of continued failure, switch to the `unavailable` copy. Handled entirely in `useSocket.ts` with a `setTimeout`.

### 12.7 — AI confidence threshold is configurable

The `0.85` confidence threshold for triggering an automatic user ban in `ai.service.ts` should be extracted to an env var `AI_BAN_CONFIDENCE_THRESHOLD=0.85` to allow tuning without a code deploy.

Add to `src/env.ts`:
```ts
AI_BAN_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
```

### 12.8 — Rate-limit on moderation endpoints

Add a simple in-memory rate limiter on the moderation `POST` endpoints to prevent moderators from accidentally double-submitting actions. Use `@fastify/rate-limit` (or a lightweight token bucket per `moderatorId`). Not strictly required for Stage 1 but recommended before production.

---

## 13. Testing Decisions

### Philosophy

Tests verify observable external behaviour only. A test should read: "given input X, the system produces output Y." Never assert on private Maps, internal call order, or implementation-specific method names.

### Render backend tests

**`GET /health`** — Supertest/inject. Returns `{ ok: true }`.

**`GET /reset-time`** — Unit + inject. `resetAt` is always next UTC midnight; `secondsRemaining` is non-negative.

**`GET /bootstrap`** — Unit + inject. Returns complete shape matching `BootstrapResponse`. `realtime.url` matches `REALTIME_PUBLIC_URL` env.

**`GET /messages`** — Integration + inject. Unauthenticated.
- Returns newest page of non-expired, non-hidden messages for today.
- Includes `moderation_status in ('visible','under_review')`, excludes `hidden`.
- Supports cursor paging (`cursor` returns older messages) and returns `nextCursor`.

**`verifySupabaseToken.ts`** — Unit with mocked Supabase client. Valid token → `VerifiedUser`. Invalid/expired → `null`.

**`nickname.generator.ts`** — Unit, pure.
- Same `(userId, resetDay)` → identical nickname.
- Different `resetDay` → different nickname.
- Always a non-empty string.

**`getNextReset.ts`** — Unit, pure.
- Given a time before midnight → correct `resetAt` and `resetDay`.
- Given exactly midnight → `secondsRemaining = 0` from `reset-time` route.
- Given one second after midnight → correct next day `resetAt`.

**`cooldown.service.ts`** — Unit with `vi.spyOn(Date, 'now')`.
- First call → `allowed: true`.
- Second call within 5s → `allowed: false`.
- Call after cooldown window → `allowed: true`.

**`duplicate.service.ts`** — Unit.
- First two identical → `true`.
- Third identical → `false`, user muted.
- `isMuted()` → `true`. After window → `false`.
- Different content resets counter.

**`message.repository.ts` — `saveMessage`** — Integration.
- Persists with `expires_at` = next UTC midnight.

**`message.repository.ts` — `getRecentMessages`** — Integration.
- Returns only `moderation_status in ('visible','under_review')` and `expires_at > now()`.
- Ordered by `created_at ASC`.
- Respects `limit`.

**`report.service.ts`** — Integration.
- Saves report record.
- Duplicate report → `alreadyReported: true`.
- `report_count` increments correctly.
- Threshold transitions: 0–2 = `visible`, 3–4 = `under_review`, 5+ = `hidden`.
- `queueAiModeration` is called (can mock it).

**`ai.service.ts`** — Unit with mocked `aiClient`.
- `safe` verdict → message stays visible, no ban.
- `harmful` verdict + confidence ≥ `AI_BAN_CONFIDENCE_THRESHOLD` → message hidden + user banned until reset.
- `harmful` verdict + confidence < `AI_BAN_CONFIDENCE_THRESHOLD` → message hidden, no ban.
- `uncertain` verdict → `manual_review_status = 'pending'`.
- AI throws → `ai_moderation_status = 'failed' | 'limited'`, `manual_review_status = 'pending'`.

**`moderation.service.ts`** — Integration.
- `hideMessage` → `moderation_status = 'hidden'`, audit log created.
- `restoreMessage` → `moderation_status = 'visible'`, audit log created.
- `banUser` → `status = 'banned'`, `banned_until = next reset`.
- `unbanUser` → `status = 'active'`, `banned_until = null`.

**`requireModerator` middleware** — Unit.
- Missing token → 401.
- Invalid token → 401.
- Valid token, `role = 'user'` → 403.
- Valid token, `role = 'moderator'` → passes through.

**`deleteExpiredMessages`** — Integration.
- Removes messages where `expires_at <= now()`.
- Leaves messages where `expires_at > now()`.

---

## 14. Build Order

Execute steps in strict order; verify each before proceeding.

```
Step 1 — Supabase SQL schema + RLS
  1a. Backup Supabase DB (pg_dump or dashboard export)
  1b. Paste supabase/migrations/0001_ephemora_initial.sql into Supabase SQL editor
      (or: supabase db push via CLI)
  1c. Verify all 5 tables exist: ephemera_users, daily_identities,
      ephemera_messages, ephemera_reports, moderation_actions
  1d. Verify RLS is enabled on all 5 tables
  1e. Verify no policies exist on Ephemera tables (service role key bypasses RLS)

Step 2 — Supabase Auth
  2a. Enable Google OAuth provider in Supabase Auth dashboard
  2b. Enable GitHub OAuth provider
  2c. Add redirect URLs:
        http://localhost:5173/auth/callback
        https://ephemora.mkgpdev.xyz/auth/callback
  2d. Test OAuth locally before proceeding

Step 3 — Render realtime backend: HTTP layer
  3a. Create ephemora-realtime-server repository
  3b. Implement env.ts, lib/, utils/
  3c. Implement GET /health, /reset-time, /bootstrap, /messages
  3d. Verify: curl http://localhost:4000/bootstrap returns correct shape
  3e. Verify: realtime.url field matches REALTIME_PUBLIC_URL env

Step 4 — Render realtime backend: Socket.IO + chat
  4a. Implement modules/auth/, modules/identity/, modules/rate-limit/
  4b. Implement modules/messages/ (message.repository, cleanup)
  4c. Implement modules/chat/ (chat.gateway, chat.service, chat.types)
  4d. Test locally: connect with no token (visitor) → can receive message:new; connect with token → receive user:identity and can message:send
  4e. Test: send message → broadcast + persist
  4f. Test: chat:reset fires at simulated midnight

Step 5 — Cloudflare Workers AI moderation
  5a. Obtain Cloudflare Workers AI account id + API token
  5b. Add CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_WORKERS_AI_BASE_URL to env
  5c. Implement lib/ai.ts, modules/moderation/ai.service.ts
  5d. Implement modules/reports/report.service.ts
  5e. Test: report a test message → verify ai_moderation_status updates
  5f. Test: simulate AI 'harmful' → message hidden, user banned
  5g. Test: simulate AI failure → manual_review_status = 'pending'

Step 6 — Moderation board: backend
  6a. Implement modules/moderation/moderation.service.ts
  6b. Implement modules/moderation/moderationAction.repository.ts
  6c. Implement http/middleware/requireModerator.ts
  6d. Implement http/routes/moderation.route.ts
  6e. Set role='moderator' on a test user in Supabase
  6f. Test all 8 moderation endpoints with moderator token
  6g. Test 403 with non-moderator token

Step 7 — Deploy Render
  7a. Set up render.yaml
  7b. Add all env vars to Render dashboard
  7c. Deploy ephemora-realtime-server
  7d. Attach custom domain realtime.mkgpdev.xyz
  7e. Verify: GET https://realtime.mkgpdev.xyz/health → { ok: true }
  7f. Set up UptimeRobot (or Better Stack free tier) to ping /health every 5 minutes

Step 8 — Frontend: core chat
  8a. npm create vite@latest ephemora-web -- --template react-ts
  8b. Install all packages
  8c. Implement lib/ (supabase.ts, socket.ts, api.ts, queryClient.ts, theme.ts)
  8d. Implement types/ (bootstrap.ts, chat.ts)
  8e. Implement hooks/ (useBootstrap, useSession, useAuth, useSocket, useMessageHistory, useMessages,
                         useCountdown, useReportMessage)
  8f. Implement components/ and pages/ (ChatPage, About, Privacy, Terms)
  8g. Verify Geist Variable font renders via Fontsource imports
  8h. Test: initial load uses GET /messages → scroll up loads older pages → send message → see it in second tab

Step 9 — Frontend: moderation board
  9a. Implement types/moderation.ts
  9b. Implement lib/moderationApi.ts
  9c. Implement hooks/ (useModerator, useModerationReports, useModerationAiActions,
                         useBannedUsers, useModerationActions)
  9d. Implement components/moderation/ and pages/ModerationPage.tsx
  9e. Add /moderation route to App.tsx
  9f. Test with moderator account: all tabs load, all actions work

Step 10 — Deploy frontend + E2E verification
  10a. Deploy to Cloudflare Pages → ephemora.mkgpdev.xyz
  10b. E2E flow: login → nickname appears → receive history → send message → see in another tab
  10c. E2E flow: report a message → confirm AI moderation runs
  10d. E2E flow: login as moderator → hide/restore/ban/unban all work
  10e. E2E flow: wait for reset → messages clear → nickname changes next day
```

---

## 15. Out of Scope

The following are explicitly excluded from Stage 1:

- AI-generated daily conversation topics
- Image or file uploads
- Voice or video messages
- Private (direct) messages between users
- Multiple public rooms or room themes
- User-chosen nicknames
- User profiles or avatar customisation
- Follow / friend / block system
- Guest mode (unauthenticated participation)
- Permanent user bans (AI and moderator bans are until next reset only)
- Redis-backed cooldown and duplicate state (later — when scaling beyond one Render instance)
- Horizontal Socket.IO scaling
- Cloudflare Worker fallback for the realtime server
- Link preview / URL unfurling
- Email notifications for moderators

---

## 16. Further Notes

### Vercel backend is fully untouched

Do not add any files, modules, env vars, or dependencies to the Vercel NestJS backend for Ephemora Stage 1. `api.mkgpdev.xyz` continues serving Blog, Weather, and AI features only.

### `SUPABASE_SERVICE_ROLE_KEY` security boundary

The service role key bypasses RLS and has full database access. It must exist **only** in Render environment variables. Never reference it from `VITE_*` env vars, never commit it to a repository, and never log it. If it is accidentally exposed, rotate it immediately from the Supabase dashboard.

### In-memory state and restarts

`cooldowns`, `duplicates`, and `mutes` Maps are in-memory. A Render restart clears all state. Users in cooldown or muted mid-session will not notice on next connection. Acceptable for Stage 1. Move to Redis when scaling beyond one Render instance.

### Render free tier constraint

Only one always-awake Render service is permitted under the free tier monthly instance-hour allowance. `ephemora-realtime-server` is that service.

### `node-cron` — always explicit UTC

```ts
cron.schedule('0 0 * * *',  handler, { timezone: 'UTC' });
cron.schedule('*/5 * * * *', handler, { timezone: 'UTC' });
```

Never rely on server local timezone even on Render (which defaults to UTC). Always pass `{ timezone: 'UTC' }` explicitly to prevent silent drift.

### Fontsource font-family names (exact)

| Package | CSS import | `font-family` value |
|---------|-----------|---------------------|
| `@fontsource-variable/geist` | `import '@fontsource-variable/geist/wght.css'` | `'Geist Variable'` |
| `@fontsource-variable/geist-mono` | `import '@fontsource-variable/geist-mono/wght.css'` | `'Geist Mono Variable'` |

Using `'Geist'` instead of `'Geist Variable'` causes a silent font fallback. Always use the exact names shown above in `theme.ts`.

### TanStack Query scope boundary

TanStack Query owns all HTTP-fetched state: `bootstrap`, `session`, `GET /messages` infinite-scroll pages, moderation data, and report mutations. It never touches Socket.IO event state. The `useMessages` hook keeps live pushed state in `useState`, and the UI merges `historyPages + liveMessages` with `id` dedupe. Mixing pushed real-time events with query cache invalidation introduces race conditions with no benefit in this architecture.

### React Compiler and `useCallback`

The React Compiler handles most memoisation automatically. `addMessage` and `clearMessages` in `useMessages.ts` use `useCallback` explicitly because they cross hook boundaries into `useSocket.ts`'s `useEffect` dependency array. The compiler will not automatically stabilise these cross-hook references.

### Granting moderator role

There is no self-serve moderator registration. Set `role = 'moderator'` directly in the Supabase table editor or via a one-off SQL statement:

```sql
update ephemera_users
set role = 'moderator'
where supabase_user_id = '<uuid from auth.users>';
```

This is intentional — moderator access must be manually granted by a database administrator.

### AI moderation is asynchronous and non-blocking

`queueAiModeration` is called with `void` in `report.service.ts`. The report acknowledgement is sent to the user immediately — it does not wait for the AI result. This ensures the reporting UX is instant even when AI calls take several seconds. AI decisions are written to the database asynchronously and surface in the moderation board when ready.
