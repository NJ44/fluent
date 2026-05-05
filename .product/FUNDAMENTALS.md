# Fluent — Product Fundamentals

## The Core Mechanic (How It Actually Works)

```
1. User types: "Book a table for 2 at Mario's at 8pm Saturday"
         ↓
2. User enters recipient phone number + optional what-if rules
         ↓
3. Netlify Function: initiate-call
   - Validates user has an active voice clone (else block)
   - Inserts call row: status = 'initiating'
   - Claude builds dynamic system prompt using intent + fallback rules
   - Retell LLM + Voice Agent already exist for this user (lazy-created once)
   - Retell: createPhoneCall(toNumber, agentId, dynamicVariables: {intent, fallback_rules})
   - Updates call: status = 'ringing'
         ↓
4. Retell calls recipient phone using Twilio outbound
   - First utterance is always: "Hi, this is an AI assistant... may be recorded..."
   - Then: intent-driven conversation with user's cloned ElevenLabs voice
         ↓
5. Retell webhook fires events to: POST /.netlify/functions/retell-webhook
   - call_started → status = 'active'
   - call_ended → status = 'ended' or 'failed', transcript stored
   - call_analyzed → async Claude summarization (fire-and-forget, returns 200 immediately)
         ↓
6. User on /calls/:id sees:
   - Status timeline (draft → ringing → active → ended)
   - Transcript (polling every 2s now; Phase 3 upgrades to Supabase Realtime)
   - 1-sentence outcome summary (written by Claude after call ends)
         ↓
7. Call History at /history shows all past calls with outcomes
```

## The Voice Clone (ElevenLabs IVC)

- User records **60–120 seconds** of in-browser audio via MediaRecorder API
- A scripted passage is shown (varied phonemes, avoids hard-block triggers for people who stutter)
- Client-side quality check: noise floor, silence ratio, volume levels
- Consent passphrase: "I, [name], on [date], consent to my voice being used by Fluent" (randomized per session)
- Audio uploaded to ElevenLabs Instant Voice Clone API → returns `voice_id` in seconds
- `voice_id` stored in `voice_clones` table (private to user, RLS enforced)
- One Retell Voice Agent created per user (lazy on first call), cached as `retell_agent_id`
- User can re-clone at any time from Settings (old clone superseded, not overwritten)
- User can delete clone and all audio (GDPR-compliant)

## The AI Agent (Retell)

- One RetellLLM + One Voice Agent per user (not per call — cost efficient)
- Voice Agent bound to: user's ElevenLabs voice_id + RetellLLM
- `eleven_flash_v2_5` model for <1.5s response latency
- `begin_message` is FIXED (TCPA disclosure preamble):
  ```
  "Hi, this is an AI assistant calling on behalf of [user name]. This call uses artificial 
  voice technology and may be recorded. You can say 'stop' at any time to end the call."
  ```
  This fires as the VERY FIRST utterance — before any task content. Retell fires `begin_message` 
  automatically and it cannot be suppressed.
- `general_prompt` contains `{{intent}}` and `{{fallback_rules}}` dynamic variable slots
- On each call: `retell_llm_dynamic_variables: { intent, fallback_rules, user_name }` injected

## The Barge-In (Twilio Conference — Phase 4)

- When call starts, user's browser silently joins the Twilio Conference as a muted participant
- Conference architecture: 3 legs — Retell SIP agent + recipient phone + user browser (muted)
- Barge-In button: POST to `barge-in-control` function
  - Twilio: unmute user participant
  - Retell: pause/mute AI agent
  - Perceived latency target: <300ms
- Kill-switch: ends call without requiring mic access

## The Live Transcript (Supabase Realtime — Phase 3)

- Retell streams transcript events via webhook during the call
- `retell-webhook` writes transcript chunks to `calls.transcript` in Supabase
- Supabase Realtime broadcasts changes to the browser subscriber
- Frontend re-renders on each update; active AI turn visually distinguished

## Webhook Reliability Pattern

Netlify Functions have a **10-second execution timeout**. Retell sends webhook events and expects a fast 200 OK. Solution:
- `retell-webhook.ts` returns `200 OK` immediately for ALL events
- Claude summarization is fired as `void generateOutcomeSummary(...)` (never awaited)
- Summarization happens asynchronously after the 200 is sent
- If it times out, the row just stays without `outcome_summary` — no crash, no webhook retry loop

## Webhook Signature Verification

- Retell signs webhooks with HMAC-SHA256
- Secret: `RETELL_API_KEY` (NOT a separate webhook secret — same key)
- Signs: `rawBody + timestampStr`
- Header format: `x-retell-signature: v={timestamp_ms},d={hex_signature}`
- 5-minute replay window; timing-safe compare via `crypto.timingSafeEqual`

## Database Schema (Key Tables)

### `voice_clones`
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| status | text | `active`, `deleted` |
| elevenlabs_voice_id | text | returned by ElevenLabs IVC |
| retell_agent_id | text | lazy-created on first call |
| retell_llm_id | text | paired with agent |
| sample_storage_path | text | Supabase Storage path |
| created_at | timestamptz | |

### `calls`
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| intent | text | user's plain-English goal |
| what_ifs | jsonb | array of fallback rule strings |
| to_number | text | recipient in E.164 format |
| status | text | lifecycle: `draft→initiating→ringing→active→ended→analyzed│failed` |
| retell_call_id | text | for webhook correlation |
| transcript | text | full call transcript (post-call) |
| outcome_summary | text | 1-sentence Claude summary |
| disconnection_reason | text | from Retell on ended/failed |
| duration_ms | int | call duration in milliseconds |
| started_at | timestamptz | |
| ended_at | timestamptz | |
| created_at | timestamptz | |

## Key Technical Constraints

| Constraint | Why It Matters |
|-----------|----------------|
| Netlify 10s function timeout | All webhook handlers return 200 immediately; heavy work is async fire-and-forget |
| Supabase Realtime for transcript | SSE disqualified by Netlify timeout; polling (Phase 2) upgraded to Realtime (Phase 3) |
| ElevenLabs IVC via Retell native | ElevenLabs BYOK (bring-your-own-key) not supported in Retell; use Retell's native clone API |
| One agent per user (not per call) | Cost and latency optimization; agent reuses via `retell_llm_dynamic_variables` |
| TCPA begin_message is mandatory | US FCC law requires AI disclosure before task content; Retell fires `begin_message` first and it cannot be overridden mid-call |
| PayPal (not Stripe) | Global billing requirement consistent with Boltcall — Stripe unavailable in Israel for the founder |
| Phase 4 is highest architectural risk | Retell SIP-into-Twilio-Conference is community-confirmed but no canonical example exists — spike required before committing plan |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind + Radix UI + Zustand |
| Backend | Netlify Functions (TypeScript) |
| Database + Auth | Supabase (Postgres + Row-Level Security + Realtime) |
| AI Call Agent | Retell SDK |
| Voice Cloning | ElevenLabs Instant Voice Clone |
| Phone Infrastructure | Twilio (outbound + Conference for barge-in) |
| Post-call Summarization | Anthropic Claude (claude-haiku-4-5 for cost) |
| Storage | Supabase Storage (voice samples, consent recordings) |
| Billing | PayPal Subscriptions |
| Calendar | Google Calendar API (Phase 5) |
| Supabase Project | voermsyzakngbllmqlvc (us-east-1) |

---
*Created: 2026-05-05*
