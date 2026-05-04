# Architecture Research — Fluent

**Domain:** Real-time AI phone call proxy with voice cloning and barge-in
**Researched:** 2026-05-04
**Confidence:** HIGH on Twilio/Supabase patterns; MEDIUM on Retell+Twilio Conference SIP bridge

---

## Executive Summary

Fluent is a **multi-leg telephony orchestration** problem. Three audio legs must converge in a **Twilio Conference**:
1. The user's browser (muted listener → barges in on demand)
2. The recipient's phone
3. The Retell AI agent (speaking in the user's cloned voice)

The core architectural insight: **Netlify Functions hold zero state.** All call lifecycle state lives in Supabase Postgres; all real-time UI updates stream over Supabase Realtime; all telephony state lives inside Twilio's Conference resource. Webhooks are the synchronizers.

**The hardest question:** How Retell's outbound call participates in the same Twilio Conference as the browser. The right pattern: **Twilio owns the Conference, Retell SIPs in** — not the inverse.

---

## High-Level Topology

```
                                  ┌─────────────────────────┐
                                  │   React 19 + Vite SPA   │
                                  │  (browser, the user)    │
                                  └───────┬─────────────┬───┘
                                          │             │
                              Supabase    │             │  Twilio Voice JS SDK
                              Realtime WS │             │  (WebRTC, audio leg)
                                          ▼             ▼
    ┌──────────────────────┐   ┌──────────────────┐   ┌──────────────────────┐
    │  Supabase Postgres   │◀──┤ Netlify Functions├──▶│  Twilio Conference   │
    │  - users/profiles    │   │  (stateless)     │   │  "fluent-{call_id}"  │
    │  - voice_clones      │   │                  │   │                      │
    │  - calls             │   │  /create-call    │   │  Participants:       │
    │  - transcript_events │   │  /barge-in       │   │   1. User (muted)    │
    │  - webhook_events    │   │  /retell-webhook │   │   2. Recipient       │
    │  - usage_counters    │   │  /twilio-webhook │   │   3. Retell (SIP)    │
    └──────────────────────┘   │  /voice-twiml   │   └──────┬───────────────┘
              ▲                │  /voice-token   │          │
              │                │  /clone-voice   │          │ SIP
              │                └────┬──────┬─────┘          │
              │                     │      │                 ▼
              │               ┌──────────┐ ┌──────────┐ ┌──────────────┐
              │               │ElevenLabs│ │ Claude   │ │  Retell AI   │
              │               │   IVC    │ │ (intent  │ │  Agent       │
              │               │   API    │ │ parsing, │ │  (voice_id + │
              │               └──────────┘ │ summary) │ │   SIP dial)  │
              │                            └──────────┘ └──────┬───────┘
              └─────────── transcript webhooks ─────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Talks To |
|-----------|----------------|----------|
| **React SPA** | Auth, intent input, transcript viewer, barge-in button, mic capture (WebRTC) | Supabase (auth + realtime + queries), Netlify fns (mutations), Twilio Voice JS SDK |
| **Netlify Functions** | All third-party API calls, webhook receivers, business logic. **Stateless.** | Supabase admin, Twilio REST, Retell SDK, ElevenLabs API, Claude API |
| **Supabase Postgres** | Source of truth for all state | Netlify fns (admin role), React SPA (RLS-scoped) |
| **Supabase Realtime** | Push transcript_events INSERTs + calls UPDATEs to browser | React SPA |
| **Twilio Conference** | Source of truth for telephony state | Twilio webhooks → Netlify, Twilio REST ← Netlify, Voice JS SDK ← Browser |
| **Retell Agent** | Speaks in user's cloned voice, sends transcript chunks | ElevenLabs (TTS), Twilio (SIP audio), Netlify (webhooks) |
| **ElevenLabs IVC** | Owns the user's `voice_id` | Netlify fns (CRUD), Retell agent (TTS) |
| **Claude** | Pre-call: parse intent → structured prompt + fallbacks. Post-call: 1-sentence summary. | Netlify fns only |

**Boundary rule:** The browser **never** holds API keys for Twilio, Retell, ElevenLabs, or Claude. It holds only a Supabase anon key and a short-lived Twilio Voice Access Token (issued per-call).

---

## Call State Machine

```
draft ──► initiating ──► ringing ──► active
  │            │             │          │
  │          failed      no_answer   barged_in
  │            │             │          │
  └──► cancelled         ended ◄────────┘
                             │
                          analyzed
```

| State | Driven By | Trigger |
|-------|-----------|---------|
| `draft` | SPA | UI only |
| `initiating` | `/create-call` | INSERT into calls, Twilio call created |
| `ringing` | Twilio webhook | `call.status=ringing` |
| `active` | Twilio webhook | `call.status=in-progress` AND Retell joined |
| `barged_in` | `/barge-in` | User clicked → Retell muted, user unmuted |
| `ended` | Retell `call_ended` OR Twilio `call.completed` | First-write-wins |
| `analyzed` | Retell `call_analyzed` | Outcome summary written |

**Transition pattern:** Use `UPDATE ... WHERE status IN ('expected_priors')`. Ignore "0 rows updated" (already transitioned). Prevents webhook races.

---

## Real-Time Transcript — Supabase Realtime

**Pattern:** INSERT per transcript chunk from Retell webhook → Supabase Realtime pushes to browser.

```ts
// Netlify webhook handler
await supabaseAdmin.from('transcript_events')
  .insert({ call_id, seq, role, text, ts: Date.now() });

// React frontend
supabase.channel(`transcript:${callId}`)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'transcript_events',
    filter: `call_id=eq.${callId}`
  }, (payload) => setTranscript(t => [...t, payload.new]))
  .subscribe();
```

**Why postgres_changes (not SSE, not polling):**
- Netlify Functions: 10s (26s Pro) cap disqualifies SSE for multi-minute calls
- Polling at 1s = 60 fn invocations/min per active call — too expensive
- postgres_changes: sub-500ms p50, durable (replay on reconnect), no extra infra

---

## Barge-In Architecture

**Full flow:**

1. `/create-call` generates Twilio Voice Access Token → browser joins Conference as **muted** participant
2. Netlify dials recipient via `Calls.create()` → TwiML routes into Conference (`startConferenceOnEnter="true"`)
3. Netlify dials Retell via SIP: `sip:<agent_id>@sip.retellai.com` as third participant
4. **Barge-in:** POST `/barge-in` → Twilio REST mutes Retell participant, unmutes user participant → UPDATE `calls.status = 'barged_in'`
5. Supabase Realtime pushes state change → SPA shows "You are live"

**Barge-in latency budget:** Click → unmute round-trip target <700ms. Twilio Participant API p95 ~250ms + Netlify cold-start risk. Mitigation: keep function warm or use Edge Function for this endpoint.

---

## Database Schema

```sql
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  plan           text not null default 'free',    -- free | premium | pro
  plan_renews_at timestamptz,
  created_at     timestamptz not null default now()
);

create table voice_clones (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  elevenlabs_id   text not null,
  name            text not null default 'My voice',
  sample_url      text,           -- Supabase Storage path
  status          text not null default 'active', -- active | superseded | deleted
  created_at      timestamptz not null default now(),
  superseded_at   timestamptz
);
create unique index voice_clones_active_per_user
  on voice_clones(user_id) where status = 'active';

create table calls (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null references auth.users(id) on delete cascade,
  voice_clone_id                uuid references voice_clones(id),
  status                        text not null default 'draft',
  recipient_phone               text not null,
  intent_raw                    text not null,
  intent_parsed                 jsonb,
  twilio_conference_sid         text,
  twilio_user_participant_sid   text,
  twilio_recipient_call_sid     text,
  twilio_retell_participant_sid text,
  retell_call_id                text,
  initiated_at                  timestamptz,
  answered_at                   timestamptz,
  ended_at                      timestamptz,
  duration_seconds              int,
  outcome_summary               text,
  outcome_structured            jsonb,
  created_at                    timestamptz not null default now()
);
create index calls_user_status   on calls(user_id, status);
create index calls_user_created  on calls(user_id, created_at desc);
create index calls_retell_id     on calls(retell_call_id) where retell_call_id is not null;
create index calls_conference    on calls(twilio_conference_sid) where twilio_conference_sid is not null;

create table transcript_events (
  id      bigserial primary key,
  call_id uuid not null references calls(id) on delete cascade,
  seq     int not null,
  role    text not null,     -- agent | recipient | system
  text    text not null,
  ts      timestamptz not null default now()
);
create unique index transcript_events_call_seq on transcript_events(call_id, seq);

create table webhook_events (
  id          bigserial primary key,
  provider    text not null,    -- retell | twilio
  event_id    text not null,    -- composite key
  raw         jsonb not null,
  received_at timestamptz not null default now()
);
create unique index webhook_events_dedupe on webhook_events(provider, event_id);

create table usage_counters (
  user_id    uuid not null references auth.users(id) on delete cascade,
  period     text not null,    -- '2026-05'
  calls_made int not null default 0,
  primary key (user_id, period)
);
```

---

## Webhook Security Pattern

| Provider | Header | Algorithm | SDK method |
|----------|--------|-----------|------------|
| Twilio | `X-Twilio-Signature` | HMAC-SHA1 | `twilio.validateRequest()` |
| Retell | `x-retell-signature` | HMAC-SHA256 | `Retell.verify()` |

**Rules:**
1. Read raw body **before** parsing JSON — `event.body` string is the input to verify
2. Return `200 OK` IMMEDIATELY, process async (Retell retries on non-2xx within 10s)
3. Dedupe via `webhook_events(provider, event_id)` with UNIQUE index — `ON CONFLICT DO NOTHING`
4. Return `403` on signature failure (not 401, not 500 — Twilio stops retrying on 4xx)

---

## Suggested Build Order

| Phase | What Gets Built | Validates |
|-------|----------------|-----------|
| 1 | Auth + voice clone foundation (Supabase + ElevenLabs IVC, no calls) | ElevenLabs integration, auth, file upload, RLS |
| 2 | Outbound call without browser audio (Retell + Twilio, one-way) | Retell outbound, voice cloning end-to-end, webhook security |
| 3 | Live transcript streaming (Supabase Realtime + Claude summary) | Realtime fanout, latency budget, post-call flow |
| 4 | Browser audio leg — **highest risk** (Twilio Voice JS SDK + Conference) | WebRTC mic, three-leg Conference |
| 5 | Barge-in (mute toggle + UI button) | Real-time Conference control, latency |
| 6 | Polish (billing, calendar, error states) | Commercial viability |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Instead |
|--------------|---------|---------|
| SSE from Netlify Functions | 10s cap, calls last minutes | Supabase Realtime |
| Storing Twilio Auth Token in browser | Can dial premium-rate numbers → bankrupt overnight | Short-lived Voice Access Token only |
| Retell owns the Conference | Can't inject user as muted listener | Twilio owns Conference, Retell SIPs in |
| Polling for transcript | 6000 fn invocations/min at 100 concurrent calls | Realtime subscription |
| Query voice_clones without status filter | After re-clone, old voice_id may be referenced | Always filter `WHERE status = 'active'` |
| Acting on both Twilio + Retell end-of-call webhooks | Double-charges user, double-summarizes | First-write-wins UPDATE pattern |

---

## Sources
- [Twilio Voice Conference docs](https://www.twilio.com/docs/voice/conference)
- [Twilio Voice JS SDK](https://www.twilio.com/docs/voice/sdks/javascript)
- [Twilio Access Tokens](https://www.twilio.com/docs/iam/access-tokens)
- [Twilio Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Retell Webhook + Secure Webhook](https://docs.retellai.com/features/webhook-overview)
- [Retell Twilio SIP](https://docs.retellai.com/deploy/twilio)
- [ElevenLabs IVC API](https://elevenlabs.io/docs/api-reference/voices/ivc/create)
- [Supabase Realtime postgres_changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
