# Phase 2: Outbound Call Engine — Research

**Researched:** 2026-05-04
**Domain:** Retell AI Outbound Calls + TCPA Compliance + Anthropic Claude Summarization + Supabase Schema
**Confidence:** HIGH overall (MEDIUM on TCPA exact mandatory disclosure text — FCC rules still partially proposed)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTENT-01 | User can type a call goal in plain English | React form field → stored in `calls` table `intent` column; passed as `{{intent}}` dynamic variable to Retell agent |
| INTENT-02 | User can enter recipient phone number | E.164 validation client-side; `to_number` field in `calls` table; passed to `client.call.createPhoneCall()` |
| INTENT-03 | User can add 2–3 fallback rules | Text area array → stored as `fallback_rules` (text[]) in `calls` table; injected as `{{fallback_rules}}` dynamic variable |
| INTENT-04 | Submit blocked without active voice clone | `ProtectedRoute` check + server-side guard: query `voice_clones WHERE status='active'` before creating call |
| CALL-01 | Outbound AI call placed using cloned voice | `client.call.createPhoneCall({ from_number, to_number })` using agent pre-created with `voice_id = retell_voice_id` |
| CALL-02 | Every call begins with AI-disclosure preamble | Hardcoded in `begin_message` or `general_prompt` preamble section of Retell LLM — cannot be overridden at call-time |
| CALL-03 | Every call includes recording-disclosure statement | Appended to TCPA preamble in `begin_message` — delivered before any task content |
| CALL-05 | Call lifecycle tracked in real time | `calls.status` column with CHECK constraint; Retell webhooks (`call_started` → `call_ended` → `call_analyzed`) drive state transitions |
| CALL-06 | End-to-end AI response latency target <1.5s | ElevenLabs Flash v2.5 ~75ms TTS + Retell end-to-end ~620ms typical; IVC voice adds negligible latency |
| CALL-07 | App handles failure states with clear messages | `disconnection_reason` field in `call_ended` webhook; 9 `not_connected` values map to user-facing messages |
| CALL-08 | Call logged with timestamp, recipient, intent, duration | `calls` table: `created_at`, `to_number`, `intent`, `duration_ms` from `call_ended` webhook `end_timestamp - start_timestamp` |
| POST-01 | 1-sentence Claude-generated outcome summary | `call_analyzed` webhook → Netlify function → Anthropic `claude-haiku-4-5` Messages API → stored in `calls.outcome_summary` |
| POST-02 | Full call transcript stored and viewable | `call_analyzed` webhook payload `call.transcript` stored in `calls.transcript`; read back on call detail page |
| HIST-01 | List of all past calls with intent, outcome, date, status | `SELECT * FROM calls WHERE user_id = ? ORDER BY created_at DESC` via Supabase client with RLS |
| HIST-02 | User can open a past call to see full transcript | `SELECT transcript FROM calls WHERE id = ? AND user_id = ?` — RLS enforced |
</phase_requirements>

---

## Summary

Phase 2 builds the full outbound call loop: a React intent form → Netlify function → Retell `createPhoneCall` → webhook → Claude summarization → Supabase storage. The critical architectural insight is that Retell requires a **pre-created agent** bound to a **pre-purchased phone number** before any call can be placed. You cannot pass an inline system prompt at call creation time. Instead, per-call context (intent, fallback rules) is injected via `retell_llm_dynamic_variables` using `{{variable_name}}` syntax in the agent's `general_prompt`. The TCPA disclosure preamble lives in the agent's `begin_message` — it fires before any task content, which satisfies both FCC guidance and the Texas SB140 "within 30 seconds" requirement.

The Retell webhook pipeline drives all state transitions: `call_started` → status `active`, `call_ended` → status `ended` + store transcript, `call_analyzed` → status `analyzed` + trigger Claude summarization. The webhook signature format is `v={timestamp_ms},d={hex}` with HMAC-SHA256 over `raw_body + timestamp` using the API key. The `verify-signatures.ts` stub from Phase 1 must be completed with this exact algorithm. Claude `claude-haiku-4-5` (fastest, cheapest at $1/MTok input) is the right model for the 1-sentence summarization task — a typical call transcript fits in ~2k tokens, costing fractions of a cent.

**Primary recommendation:** Pre-create one Retell LLM + one Retell agent per user (not per call) at voice-clone time or lazily on first call intent. Store `retell_agent_id` and `retell_llm_id` in the `voice_clones` table. At call time, call `createPhoneCall` with `retell_llm_dynamic_variables` containing intent and fallback rules. The TCPA preamble is hardcoded in `begin_message` and cannot be accidentally omitted.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `retell-sdk` | latest | Create agents, LLMs, phone calls; receive webhook types | Official SDK; full TypeScript types; already in Boltcall |
| `@supabase/supabase-js` | 2.x | Supabase client for calls table CRUD + RLS | Already installed |
| `@anthropic-ai/sdk` | latest | Claude Messages API for post-call summarization | Official SDK; type-safe; simple `.messages.create()` |
| `@netlify/functions` | 5.x | Netlify Function handler types | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `crypto` | built-in | HMAC-SHA256 for Retell webhook signature verification | Webhook receiver Netlify function only |
| React Hook Form or controlled state | — | Intent form with validation | Simple 3-field form; no external lib needed |
| Zustand | latest | Call status state in browser | Already in stack; track `callStatus` as `draft → initiating → ...` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| One agent per user | One shared agent with full per-call overrides | Retell `agent_override` does NOT support `general_prompt` override — per-user agent is required |
| `claude-haiku-4-5` for summary | `claude-sonnet-4-6` | Haiku is 5× cheaper, 3× faster; a 1-sentence summary is not a reasoning task |
| Retell `begin_message` for TCPA preamble | Injecting TCPA text via dynamic variable | `begin_message` is hardcoded in the agent/LLM; cannot be removed by variable override — safer |
| Polling for call status | Supabase Realtime subscription | Polling is expensive; Realtime already enabled on calls table; use it in Phase 3 |

**Installation:**
```bash
npm install @anthropic-ai/sdk
```
(retell-sdk already present; @supabase/supabase-js already present)

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── pages/
│   ├── Dashboard.tsx          # Intent form (INTENT-01/02/03/04)
│   ├── CallStatus.tsx         # Lifecycle display (CALL-05/07)
│   ├── CallDetail.tsx         # Transcript + summary (POST-01/02)
│   └── CallHistory.tsx        # Past calls list (HIST-01/02)
├── components/
│   └── IntentForm.tsx         # Call goal + phone + fallback rules
├── store/
│   └── callStore.ts           # Zustand: callStatus, callId
netlify/functions/
├── _shared/
│   ├── verify-signatures.ts   # COMPLETE the verifyRetellSignature() stub
│   ├── auth-utils.ts          # verifyBearerToken() — reuse as-is
│   ├── token-utils.ts         # getServiceSupabase() — reuse as-is
│   └── cors.ts                # getCorsHeaders() — reuse as-is
├── initiate-call.ts           # NEW: validate intent → lookup agent_id → createPhoneCall
├── retell-webhook.ts          # NEW: receive call_started/call_ended/call_analyzed
└── summarize-call.ts          # NEW: Claude API → outcome_summary (or inline in webhook)
supabase/migrations/
└── 20260504000004_create_calls.sql  # NEW: calls table + RLS
```

### Pattern 1: Retell Agent Architecture (One Per User)

**What:** A Retell LLM + Voice Agent is created for each user once (at clone completion or lazily on first call). The LLM's `general_prompt` contains `{{intent}}` and `{{fallback_rules}}` placeholders. `begin_message` contains the hardcoded TCPA preamble.

**When to use:** Every Phase 2 call. The agent is reused for all calls from that user — only the dynamic variables change per call.

**The setup flow (done once per user):**
```
1. User completes voice clone → retell_voice_id stored
2. Create Retell LLM (POST /create-retell-llm) → llm_id
3. Create Retell Agent (POST /create-agent) with voice_id + llm_id → agent_id
4. Store llm_id + agent_id in voice_clones table
5. At call time: createPhoneCall with from_number + to_number + retell_llm_dynamic_variables
```

**Key insight:** The phone number (`from_number`) must be purchased in the Retell dashboard and associated with the account. In Fluent's case, Fluent owns one outbound number used for all calls (Twilio-sourced or Retell-managed).

### Pattern 2: Retell LLM Creation

**What:** Create the Retell LLM with the user's agent prompt including TCPA preamble in `begin_message` and task context via dynamic variables.

**When to use:** Once per user, at voice clone creation or lazily at first call intent.

```typescript
// Source: docs.retellai.com/api-references/create-retell-llm (verified 2026-05-04)
import Retell from 'retell-sdk';
const client = new Retell({ apiKey: process.env.RETELL_API_KEY! });

const llm = await client.llm.create({
  // TCPA preamble MUST be in begin_message — fires before any task content
  begin_message: `Hi, this is an AI assistant calling on behalf of {{user_name}}. ` +
    `This call uses artificial intelligence technology to place this call. ` +
    `This call may be recorded for quality purposes. ` +
    `You can say "stop" at any time to end this call.`,

  general_prompt: `You are an AI assistant calling on behalf of {{user_name}}.

TASK: {{intent}}

FALLBACK RULES: {{fallback_rules}}

GUIDELINES:
- Be polite, clear, and concise
- Follow the fallback rules if the primary goal cannot be achieved
- When the task is complete or clearly not achievable, say goodbye and hang up
- Never claim to be a human if asked directly
- Never share personal information about the user beyond what is needed for the task`,

  model: 'gpt-4.1',  // or 'claude-4.5-haiku' for Claude-native agent

  default_dynamic_variables: {
    user_name: 'the user',  // Overridden at call time
    intent: 'assist the recipient',
    fallback_rules: 'If unavailable, thank them and hang up',
  },
});
// llm.llm_id → store in voice_clones.retell_llm_id
```

### Pattern 3: Retell Agent Creation

**What:** Create a Voice Agent bound to the user's LLM and cloned voice.

**When to use:** Once per user, immediately after LLM creation.

```typescript
// Source: docs.retellai.com/api-references/create-agent (verified 2026-05-04)
const agent = await client.agent.create({
  response_engine: {
    type: 'retell-llm',
    llm_id: llm.llm_id,
  },
  voice_id: retellVoiceId,  // retell_voice_id from voice_clones table
  voice_model: 'eleven_flash_v2_5',  // ElevenLabs Flash v2.5 for <1.5s latency
  agent_name: `fluent-${userId}`,
  webhook_url: `${process.env.URL}/.netlify/functions/retell-webhook`,
  webhook_events: ['call_started', 'call_ended', 'call_analyzed'],
});
// agent.agent_id → store in voice_clones.retell_agent_id
```

### Pattern 4: Place Outbound Call (initiate-call.ts)

**What:** Netlify function that validates the user has an active clone, creates a call record in Supabase, then calls Retell.

**When to use:** Called from the browser when user submits the intent form.

```typescript
// Source: docs.retellai.com/api-references/create-phone-call (verified 2026-05-04)
const call = await client.call.createPhoneCall({
  from_number: process.env.RETELL_FROM_NUMBER!,  // Fluent's owned number (E.164)
  to_number: toNumber,      // From user input (E.164)
  override_agent_id: agentId,  // User's per-user agent
  retell_llm_dynamic_variables: {
    user_name: userName,
    intent: intent,
    fallback_rules: fallbackRules.join('; '),
  },
  metadata: {
    fluent_call_id: fluentCallId,  // Our Supabase call.id for webhook correlation
    user_id: userId,
  },
});
// call.call_id → store in calls.retell_call_id
// call.call_status → 'registered' initially
```

### Pattern 5: Retell Webhook Handler (retell-webhook.ts)

**What:** Receives `call_started`, `call_ended`, and `call_analyzed` events. Drives `calls.status` state machine.

**When to use:** All Retell call lifecycle events.

```typescript
// Source: docs.retellai.com/features/secure-webhook (verified 2026-05-04)
// Source: docs.retellai.com/features/webhook (verified 2026-05-04)

export const handler: Handler = async (event) => {
  // 1. Signature verification — MUST happen FIRST before any processing
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf-8')
    : (event.body || '');
  const signature = event.headers['x-retell-signature'] || '';
  if (!verifyRetellSignature(rawBody, signature)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  // 2. Return 200 immediately — Retell expects fast acknowledgement
  const payload = JSON.parse(rawBody) as { event: string; call: RetellCallData };
  const { event: eventType, call } = payload;

  // 3. Correlate to our internal call record via metadata
  const fluentCallId = call.metadata?.fluent_call_id;

  const supabase = getServiceSupabase();

  if (eventType === 'call_started') {
    await supabase.from('calls').update({ status: 'active', retell_call_id: call.call_id })
      .eq('id', fluentCallId);
  }

  if (eventType === 'call_ended') {
    const duration = call.end_timestamp && call.start_timestamp
      ? call.end_timestamp - call.start_timestamp
      : null;
    await supabase.from('calls').update({
      status: 'ended',
      transcript: call.transcript,
      disconnection_reason: call.disconnection_reason,
      duration_ms: duration,
    }).eq('id', fluentCallId);
  }

  if (eventType === 'call_analyzed') {
    // call.call_analysis available here — but we use Claude for our own summary
    await supabase.from('calls').update({
      status: 'analyzed',
      transcript: call.transcript, // final version
    }).eq('id', fluentCallId);

    // Trigger summarization (can be inline or via separate function)
    await generateOutcomeSummary(fluentCallId, call.transcript, supabase);
  }

  return { statusCode: 200, body: JSON.stringify({ ack: true }) };
};
```

### Pattern 6: Completed verifyRetellSignature()

**What:** The Phase 1 stub needs to be replaced with the real algorithm.

**When to use:** Every webhook request — MUST verify before processing.

```typescript
// Source: docs.retellai.com/features/secure-webhook (verified 2026-05-04)
// Algorithm: HMAC-SHA256(raw_body + timestamp_ms, api_key)
// Header format: "v={timestamp_ms},d={hex_digest}"
export function verifyRetellSignature(rawBody: string, signatureHeader: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;  // Note: uses API key, NOT a separate secret
  if (!apiKey) {
    console.warn('[verify-signatures] RETELL_API_KEY not set — skipping signature check');
    return true;  // Fail-open in dev only
  }
  try {
    const match = signatureHeader.match(/v=(\d+),d=(.*)/);
    if (!match) return false;
    const [, timestampStr, digest] = match;
    const timestamp = parseInt(timestampStr, 10);

    // Replay attack prevention: reject if >5 minutes old
    if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;

    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody + timestampStr)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
  } catch {
    return false;
  }
}
```

### Pattern 7: Claude Post-Call Summarization

**What:** Use `claude-haiku-4-5` to generate a 1-sentence outcome summary from the call transcript.

**When to use:** Inside `call_analyzed` webhook handler, after transcript is available.

```typescript
// Source: platform.claude.com/docs/en/about-claude/models/overview (verified 2026-05-04)
// Model: claude-haiku-4-5 ($1/MTok input, $5/MTok output — cheapest available)
import Anthropic from '@anthropic-ai/sdk';

async function generateOutcomeSummary(
  callId: string,
  transcript: string,
  supabase: SupabaseClient
): Promise<void> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    system: 'You summarize phone call transcripts in exactly one concise sentence describing the outcome. Examples: "Appointment confirmed for Tuesday at 4:00 PM." or "Restaurant was fully booked; tried alternative times without success."',
    messages: [
      {
        role: 'user',
        content: `Summarize this call in one sentence:\n\n${transcript}`,
      },
    ],
  });

  const summary = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
  await supabase.from('calls').update({ outcome_summary: summary }).eq('id', callId);
}
```

### Pattern 8: Calls Table Schema

**What:** Supabase `calls` table tracking the full lifecycle and storing all call data.

**When to use:** Migration file for Phase 2 Wave 0.

```sql
-- calls table — full lifecycle tracking for CALL-05, CALL-07, CALL-08, POST-01, POST-02
CREATE TABLE IF NOT EXISTS calls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  retell_call_id        text,              -- Retell's call_id (populated after createPhoneCall)
  retell_agent_id       text,              -- Which agent was used
  to_number             text NOT NULL,     -- E.164 recipient phone (CALL-08)
  intent                text NOT NULL,     -- User's plain-English goal (INTENT-01)
  fallback_rules        text[],            -- 0-3 fallback rules (INTENT-03)

  -- Lifecycle state machine (CALL-05)
  status                text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','initiating','ringing','active','ended','analyzed','failed')),

  -- Post-call data
  transcript            text,             -- Raw transcript from call_ended/call_analyzed (POST-02)
  outcome_summary       text,             -- Claude-generated 1-sentence summary (POST-01)
  disconnection_reason  text,             -- Retell disconnection_reason (CALL-07)
  duration_ms           bigint,           -- end_timestamp - start_timestamp (CALL-08)

  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  started_at            timestamptz,
  ended_at              timestamptz
);

-- RLS: users see only their own calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_owner_only" ON calls
  FOR ALL USING (user_id = auth.uid());

-- Index for call history list (HIST-01)
CREATE INDEX calls_user_created_idx ON calls(user_id, created_at DESC);

-- Enable Realtime for Phase 3 transcript streaming (no cost to enable now)
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
```

### Pattern 9: TCPA Disclosure Text

**What:** Hardcoded preamble in Retell LLM `begin_message`. Cannot be overridden at call time.

**Legal basis:** FCC Feb 2024 Declaratory Ruling (AI voices = "artificial or prerecorded voice" under TCPA). Texas SB140 requires disclosure within first 30 seconds.

```
"Hi, this is an AI assistant placing this call on behalf of [user_name].
This call is using artificial intelligence voice technology.
This call may be recorded.
You can say 'stop' at any time to end this call."
```

**Delivery timing:** `begin_message` fires as the very first utterance — before any task content. This satisfies both the "upfront" FCC guidance and the Texas "within 30 seconds" requirement.

**Key constraint:** The preamble must appear in every call regardless of user input. Placing it in `begin_message` (hardcoded in the LLM) prevents it from being overridden by `retell_llm_dynamic_variables`.

### Anti-Patterns to Avoid

- **Passing inline system_prompt to createPhoneCall:** `agent_override.general_prompt` override is NOT supported by Retell — the agent's LLM prompt cannot be replaced per-call. Use dynamic variables instead.
- **Storing raw audio in calls table:** Retell provides a `recording_url` in the call response — store the URL only, never fetch and re-store the audio binary.
- **Processing webhook synchronously before returning 200:** Netlify has a 10s timeout. Return `{ statusCode: 200, ack: true }` immediately, then process asynchronously or use background functions.
- **Using `not null` constraint on retell_call_id:** The call record is created before `createPhoneCall` returns — `retell_call_id` starts null and is populated by the `call_started` webhook.
- **Checking voice clone in client only (INTENT-04):** The `initiate-call` Netlify function must ALSO verify active clone server-side — client check is UX only, not security.
- **Querying calls without user_id filter:** Even with RLS, always include `user_id` in queries to benefit from the index.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone call placement | Custom Twilio SIP dialing | `client.call.createPhoneCall()` | Retell handles telephony, SIP, call routing, recording |
| AI agent prompt execution | Custom LLM call + TTS + STT | Retell LLM + voice agent | Retell handles the full STT → LLM → TTS loop with streaming |
| Webhook signature verification | Custom verification | Pattern 6 above (HMAC-SHA256) | Exact algorithm documented; 10 lines of code |
| Post-call summarization | Regex/keyword matching | Anthropic Claude `claude-haiku-4-5` | LLM handles varied call outcomes including failures |
| State machine for call lifecycle | Complex event handler | Supabase `calls.status` + webhook updates | Simple column update pattern; no external state machine library needed |
| Per-call agent creation | Create agent for every call | One agent per user, dynamic variables per call | Agent creation is slow (~500ms); creating one per call would destroy latency budget |

**Key insight:** Retell handles all the hard telephony work. Fluent's job is: create the agent once, pass the right dynamic variables, store the result, summarize with Claude.

---

## Common Pitfalls

### Pitfall 1: agent_override Does Not Support Prompt Override

**What goes wrong:** Developer tries to pass `agent_override.retell_llm.general_prompt` to customize the prompt per-call. Retell ignores it or errors silently.
**Why it happens:** Retell's `agent_override` for `retell_llm` supports model, temperature, tools, begin_after_silence, and begin_message — but NOT `general_prompt`. This is a known limitation confirmed in the Retell community forum.
**How to avoid:** Use one agent per user with `{{variable_name}}` dynamic variable placeholders in `general_prompt`. Inject per-call values via `retell_llm_dynamic_variables` at call creation time.
**Warning signs:** Agent speaks a generic prompt instead of the user's intent.

### Pitfall 2: Webhook Signature Uses API Key, Not a Separate Secret

**What goes wrong:** Developer looks for `RETELL_WEBHOOK_SECRET` env variable (as in the Phase 1 stub), uses the wrong key for HMAC computation, all webhook signatures fail.
**Why it happens:** The Phase 1 `verifyRetellSignature()` stub references `RETELL_WEBHOOK_SECRET`. The actual Retell algorithm uses the `RETELL_API_KEY` directly as the HMAC secret.
**How to avoid:** Replace the stub with Pattern 6 above. Use `process.env.RETELL_API_KEY` in the HMAC computation.
**Warning signs:** All webhooks return 401, call state never updates in Supabase.

### Pitfall 3: Webhook Returns 200 Too Late (Netlify Timeout)

**What goes wrong:** Webhook handler awaits Supabase write + Claude API call before returning 200. Netlify function times out at 10s. Retell marks webhook as failed and retries.
**Why it happens:** Claude summarization alone can take 2-4s; combined with Supabase write, total > 10s on cold start.
**How to avoid:** Return `{ statusCode: 200, body: JSON.stringify({ ack: true }) }` immediately at the top of the `call_analyzed` handler before starting Claude. Use `context.callbackWaitsForEmptyEventLoop = false` if needed, or move summarization to a separate background Netlify function triggered by the DB update.
**Warning signs:** Retell dashboard shows webhook delivery failures; call_analyzed events come in duplicate (Retell retry).

### Pitfall 4: Calls Table Created Without Retell Call ID Column

**What goes wrong:** Supabase call record created with only internal UUID. Webhook arrives with Retell `call_id` but no way to correlate to the internal record.
**How to avoid:** Pass `metadata: { fluent_call_id: internalId }` in `createPhoneCall`. On webhook arrival, read `call.metadata.fluent_call_id` to look up the Supabase record. Also store `retell_call_id` in the Supabase record when the `call_started` webhook arrives.
**Warning signs:** Webhook handler logs "call not found" errors; call status stuck at `initiating`.

### Pitfall 5: TCPA Preamble Accidentally Skippable

**What goes wrong:** TCPA text is placed in `general_prompt` and interpolated via a dynamic variable. If the variable is missing, the preamble is skipped or appears garbled.
**Why it happens:** `general_prompt` variables only appear if the agent reaches that part of the conversation; `begin_message` is guaranteed to fire as the first utterance.
**How to avoid:** Hardcode the TCPA preamble verbatim in `begin_message`. Never put it in a dynamic variable. Test that it fires on every call regardless of intent input.
**Warning signs:** QA calls where the AI jumps directly to the task without a disclosure.

### Pitfall 6: E.164 Validation Missing for Recipient Number

**What goes wrong:** User enters `555-1234` (no country code). `createPhoneCall` fails with `invalid_destination`. Error surfaces as a generic crash.
**Why it happens:** Retell requires E.164 format (`+12125551234`). No automatic normalization.
**How to avoid:** Client-side validation with regex `/^\+[1-9]\d{7,14}$/`. Show inline error "Please use international format: +1 (country code) + number". Also set `ignore_e164_validation: false` (default) so Retell will catch through.
**Warning signs:** `disconnection_reason: 'invalid_destination'` for all calls with non-E.164 numbers.

### Pitfall 7: Audio Race on First 500ms

**What goes wrong:** Call connects but the first 500ms of audio is garbled or lost. Retell's begin_message may start playing before the audio codec is negotiated.
**Why it happens:** Telephony codec negotiation + Retell streaming setup overhead on call connect.
**How to avoid:** Add a 0.5–1s silent pause at the start of `begin_message`: include a brief pause utterance or use Retell's `begin_after_user_silence_ms` to let the call stabilize before the agent starts speaking.
**Warning signs:** QA calls where the first word of the TCPA preamble is clipped.

---

## Code Examples

Verified patterns from official sources:

### Retell LLM + Agent + Call (Full TypeScript — SDK)

```typescript
// Source: docs.retellai.com/api-references/create-retell-llm, create-agent, create-phone-call
import Retell from 'retell-sdk';
const client = new Retell({ apiKey: process.env.RETELL_API_KEY! });

// Step 1: Create LLM (once per user)
const llm = await client.llm.create({
  begin_message: 'Hi, this is an AI assistant calling on behalf of {{user_name}}. This call uses AI voice technology and may be recorded. You can say "stop" at any time.',
  general_prompt: 'You are calling on behalf of {{user_name}}.\n\nTASK: {{intent}}\n\nFALLBACK: {{fallback_rules}}\n\nBe concise, polite, and hang up when done.',
  model: 'gpt-4.1',
  default_dynamic_variables: { user_name: 'the user', intent: '', fallback_rules: '' },
});

// Step 2: Create Agent (once per user)
const agent = await client.agent.create({
  response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
  voice_id: retellVoiceId,
  voice_model: 'eleven_flash_v2_5',
  agent_name: `fluent-user-${userId}`,
  webhook_url: `${process.env.URL}/.netlify/functions/retell-webhook`,
  webhook_events: ['call_started', 'call_ended', 'call_analyzed'],
});

// Step 3: Place call (per call)
const phoneCall = await client.call.createPhoneCall({
  from_number: process.env.RETELL_FROM_NUMBER!,
  to_number: toNumber,
  override_agent_id: agent.agent_id,
  retell_llm_dynamic_variables: {
    user_name: userName,
    intent: intent,
    fallback_rules: fallbackRules.join('; '),
  },
  metadata: { fluent_call_id: supabaseCallId },
});
```

### Anthropic Claude Summarization (TypeScript — SDK)

```typescript
// Source: platform.claude.com/docs/en/get-started (verified 2026-05-04)
// Model: claude-haiku-4-5 (fastest, cheapest — $1/MTok input)
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const msg = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 100,
  system: 'Summarize phone call transcripts in exactly one sentence describing the outcome.',
  messages: [{ role: 'user', content: `Summarize: ${transcript}` }],
});
const summary = (msg.content[0] as { type: 'text'; text: string }).text.trim();
```

### Webhook Signature Verification (Completed Stub)

```typescript
// Source: docs.retellai.com/features/secure-webhook (verified 2026-05-04)
// Replaces the Phase 1 stub in verify-signatures.ts
export function verifyRetellSignature(rawBody: string, signatureHeader: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) return true;  // dev fallback
  const match = signatureHeader.match(/v=(\d+),d=(.*)/);
  if (!match) return false;
  const [, timestampStr, digest] = match;
  if (Math.abs(Date.now() - parseInt(timestampStr, 10)) > 300_000) return false;
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', apiKey).update(rawBody + timestampStr).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
}
```

### Call Status State Machine

```typescript
// Status transitions driven by webhooks
// draft      → (user submits intent form)
// initiating → (initiate-call function called, DB record created)
// ringing    → (createPhoneCall API returns successfully)
// active     → (call_started webhook received)
// ended      → (call_ended webhook received)
// analyzed   → (call_analyzed webhook received + Claude summary stored)
// failed     → (any error in initiation OR disconnection_reason indicates failure)

const FAILURE_DISCONNECTION_REASONS = new Set([
  'dial_busy', 'dial_failed', 'dial_no_answer',
  'invalid_destination', 'telephony_provider_permission_denied',
  'telephony_provider_unavailable', 'user_declined', 'marked_as_spam',
  'concurrency_limit_reached', 'error_retell', 'error_unknown',
]);

function isFailure(disconnectionReason: string): boolean {
  return FAILURE_DISCONNECTION_REASONS.has(disconnectionReason);
}
```

### Intent Form (React — Controlled State)

```typescript
// IntentForm.tsx — three fields, no external form library needed
interface CallIntent {
  toNumber: string;        // E.164 (+12125551234)
  intent: string;          // Plain English goal
  fallbackRules: string[]; // 0-3 rules
}
// Validation: toNumber matches /^\+[1-9]\d{7,14}$/, intent.length > 10
// Submit blocked if: !hasActiveVoiceClone (checked via Supabase query on mount)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ElevenLabs multilingual v2 TTS | `eleven_flash_v2_5` | 2024 | ~75ms vs 400ms+ TTS latency — required for <1.5s call latency |
| Create agent per call | One agent per user + dynamic variables | Community best practice ~2024 | Agent creation ~500ms; one per user eliminates overhead |
| Separate webhook secret | HMAC with API key directly | Retell launch | `RETELL_WEBHOOK_SECRET` is a misnomer — use `RETELL_API_KEY` |
| claude-3-haiku (old naming) | `claude-haiku-4-5` | 2025 | New generation; model ID format changed |

**Deprecated/outdated:**
- `eleven_turbo_v2`: Superseded by `eleven_flash_v2_5` for phone calls
- `claude-3-5-haiku` (old naming pattern): Current model is `claude-haiku-4-5`
- Retell v1 API (pre-deprecation notice 6/30/2025): Migrated to v2 — already using v2 with retell-sdk latest

---

## Open Questions

1. **Does Fluent use one shared outbound number or per-user numbers?**
   - What we know: `createPhoneCall` requires a `from_number` that must be purchased in Retell or imported. Most Retell deployments use one shared number for all outbound calls.
   - What's unclear: Whether Fluent will buy one Retell-managed number or use a Twilio number imported to Retell.
   - Recommendation: One shared Fluent outbound number stored as `RETELL_FROM_NUMBER` env var. Purchase in Retell dashboard as part of Phase 2 setup. No per-user numbers needed.

2. **Per-user agent creation: at clone time or lazily at first call?**
   - What we know: The Retell LLM + agent must exist before `createPhoneCall`. Agent creation takes ~500ms.
   - What's unclear: Whether adding agent creation to the voice clone flow would make it too slow.
   - Recommendation: Create lazily at first call intent. The `initiate-call` function checks `voice_clones.retell_agent_id`; if null, creates LLM + agent first, stores the IDs, then places the call. This adds ~1s to the very first call per user only.

3. **TCPA compliance: user consent — is the preamble sufficient?**
   - What we know: FCC Feb 2024 ruling requires "prior express consent" for AI-generated calls. Texas SB140 requires disclosure within first 30 seconds. The `begin_message` preamble satisfies the disclosure requirement.
   - What's unclear: Whether Fluent needs to collect and store the _recipient's_ prior express consent before calling (vs. just the caller/user's consent). This is a legal question, not a technical one.
   - Recommendation: For the MVP, require users to attest in the intent form: "I have permission to contact this number." Store that attestation in the call record. Flag for legal review before commercial launch.

4. **Does Retell's `call_analyzed` always fire, or only when analysis is enabled?**
   - What we know: `call_analyzed` fires when `post_call_analysis_data` is configured on the agent, or by default after every call.
   - What's unclear: Whether `call_analyzed` fires for failed/unconnected calls.
   - Recommendation: Don't rely on `call_analyzed` for failed calls. In `call_ended` handler, check `disconnection_reason`: if it indicates failure, set `status='failed'` immediately without waiting for `call_analyzed`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (already installed + configured) |
| Config file | `vitest.config.ts` — already exists from Phase 1 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INTENT-04 | `initiate-call.ts` returns 403 when no active voice clone | unit (mock Supabase) | `npx vitest run tests/initiate-call.test.ts -t "no active clone"` | Wave 0 |
| CALL-01 | `initiate-call.ts` calls `client.call.createPhoneCall` with correct fields | unit (mock Retell SDK) | `npx vitest run tests/initiate-call.test.ts -t "places call"` | Wave 0 |
| CALL-02 | Retell LLM `begin_message` contains TCPA disclosure text | unit | `npx vitest run tests/agent-setup.test.ts -t "TCPA preamble"` | Wave 0 |
| CALL-05 | `retell-webhook.ts` updates `calls.status` to `active` on `call_started` | unit (mock Supabase) | `npx vitest run tests/retell-webhook.test.ts -t "call_started"` | Wave 0 |
| CALL-05 | `retell-webhook.ts` updates `calls.status` to `ended` on `call_ended` | unit (mock Supabase) | `npx vitest run tests/retell-webhook.test.ts -t "call_ended"` | Wave 0 |
| CALL-05 | `retell-webhook.ts` updates `calls.status` to `analyzed` on `call_analyzed` | unit (mock Supabase) | `npx vitest run tests/retell-webhook.test.ts -t "call_analyzed"` | Wave 0 |
| CALL-07 | `isFailure('dial_no_answer')` returns true; status set to `failed` | unit | `npx vitest run tests/call-status.test.ts -t "failure reasons"` | Wave 0 |
| POST-01 | `generateOutcomeSummary()` calls Claude and stores result | unit (mock Anthropic SDK) | `npx vitest run tests/summarize-call.test.ts` | Wave 0 |
| HIST-01 | Calls list query returns user's calls ordered by `created_at DESC` | unit (mock Supabase) | `npx vitest run tests/call-history.test.ts -t "list calls"` | Wave 0 |
| HIST-02 | Calls detail query returns transcript for matching user+call | unit (mock Supabase) | `npx vitest run tests/call-history.test.ts -t "call detail"` | Wave 0 |
| Signature | `verifyRetellSignature()` returns false for invalid sig | unit | `npx vitest run tests/verify-signatures.test.ts` | Wave 0 |
| Signature | `verifyRetellSignature()` returns false for replayed timestamp >5min | unit | `npx vitest run tests/verify-signatures.test.ts -t "replay attack"` | Wave 0 |

**Manual-only tests:**
- CALL-01: Actual phone call placed and connects — requires Retell account + real phone number
- CALL-02: TCPA preamble fires before task content — requires live call QA
- CALL-06: End-to-end latency <1.5s — requires live call timing measurement
- POST-01: Outcome summary is accurate and useful — requires human judgment

### Sampling Rate

- **Per task commit:** `npx vitest run tests/retell-webhook.test.ts tests/initiate-call.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + live call QA before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/initiate-call.test.ts` — covers INTENT-04, CALL-01
- [ ] `tests/retell-webhook.test.ts` — covers CALL-05 (all 3 events)
- [ ] `tests/call-status.test.ts` — covers CALL-07 (failure reason mapping)
- [ ] `tests/summarize-call.test.ts` — covers POST-01
- [ ] `tests/call-history.test.ts` — covers HIST-01, HIST-02
- [ ] `tests/agent-setup.test.ts` — covers CALL-02 (TCPA preamble in LLM config)
- [ ] `tests/verify-signatures.test.ts` — covers updated verifyRetellSignature()
- [ ] `supabase/migrations/20260504000004_create_calls.sql` — calls table

*(Vitest framework already installed from Phase 1 — no new framework install needed)*

---

## Boltcall Reuse Map

**Direct reuse (zero modification):**
- `netlify/functions/_shared/auth-utils.ts` → `verifyBearerToken()` — use in `initiate-call.ts`
- `netlify/functions/_shared/token-utils.ts` → `getServiceSupabase()` — use in all new functions
- `netlify/functions/_shared/cors.ts` → `getCorsHeaders()` — use in `initiate-call.ts`
- `src/lib/supabase.ts` → Supabase browser client — use in React pages

**Modification required:**
- `netlify/functions/_shared/verify-signatures.ts` → Replace stub with Pattern 6 (real algorithm)

**New functions needed:**
- `netlify/functions/initiate-call.ts` — intent → Retell createPhoneCall
- `netlify/functions/retell-webhook.ts` — lifecycle state machine
- `netlify/functions/setup-retell-agent.ts` — create LLM + agent for user (lazy, on first call)

---

## Sources

### Primary (HIGH confidence)

- `docs.retellai.com/api-references/create-phone-call` — fetched 2026-05-04 — from_number/to_number required; agent must be pre-created; override_agent_id/retell_llm_dynamic_variables shape
- `docs.retellai.com/api-references/create-agent` — fetched 2026-05-04 — response_engine + voice_id required; webhook_url field; voice_model field
- `docs.retellai.com/api-references/create-retell-llm` — fetched 2026-05-04 — general_prompt, begin_message, default_dynamic_variables, model field values
- `docs.retellai.com/api-references/get-call` — fetched 2026-05-04 — call response fields: call_id, transcript, transcript_object, call_status, disconnection_reason, start_timestamp, end_timestamp
- `docs.retellai.com/features/secure-webhook` — fetched 2026-05-04 — header format `v={ts},d={hex}`, HMAC-SHA256(raw_body + timestamp, api_key), 5-minute replay window
- `docs.retellai.com/features/webhook` — fetched 2026-05-04 — event types (call_started/call_ended/call_analyzed), payload structure {event, call}, call_analysis only in call_analyzed
- `docs.retellai.com/build/dynamic-variables` — fetched 2026-05-04 — `{{variable_name}}` syntax, retell_llm_dynamic_variables field at call creation
- `docs.retellai.com/reliability/debug-call-disconnect` — fetched 2026-05-04 — complete disconnection_reason enum (33 values across 3 categories)
- `platform.claude.com/docs/en/about-claude/models/overview` — fetched 2026-05-04 — `claude-haiku-4-5` model ID, $1/MTok input pricing
- `platform.claude.com/docs/en/get-started` — fetched 2026-05-04 — TypeScript SDK usage, messages.create() API shape

### Secondary (MEDIUM confidence)

- Retell community forum (docs.retellai.com/community) — agent_override does NOT support general_prompt override — confirmed limitation
- FCC Feb 2024 Declaratory Ruling — AI voices = "artificial or prerecorded voice" under TCPA — requires prior express consent
- Texas SB140 — disclosure within first 30 seconds of AI-generated call — begin_message satisfies this
- ElevenLabs Flash v2.5 latency docs — ~75ms TTS inference; IVC + Flash combination fastest path
- Retell benchmark data — end-to-end ~620ms typical; <1.5s achievable with Flash v2.5 + IVC voice

### Tertiary (LOW confidence — validate at implementation)

- Retell `call_analyzed` fires for unconnected calls — assumed YES but not confirmed in docs
- Per-user agent lazy creation latency — ~500ms estimated; measure at implementation
- FCC proposed rules (July 2024) on mandatory AI disclosure language — still proposed, not finalized as of May 2026; preamble text above is a best-effort interpretation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed, versions verified
- Architecture (agent/LLM/call flow): HIGH — API shapes confirmed from official docs
- Webhook handling: HIGH — signature algorithm, payload shape, event types all confirmed
- TCPA disclosure: MEDIUM — FCC ruling confirmed; exact required text is legal interpretation, not technical spec
- Claude summarization: HIGH — model ID, pricing, API shape confirmed from official docs
- Latency target: MEDIUM — benchmarks are community/marketing data, not independently verified

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (Retell API v2 is stable; re-verify if >30 days)

**Critical implementation order:**
1. Supabase migration: `calls` table + RLS + realtime (Wave 0)
2. Fix `verify-signatures.ts` stub (Pattern 6) — needed before webhook works
3. `setup-retell-agent.ts` Netlify function — create LLM + agent per user
4. Voice clones table migration: add `retell_agent_id` + `retell_llm_id` columns
5. `initiate-call.ts` Netlify function — intent → createPhoneCall
6. `retell-webhook.ts` Netlify function — lifecycle state machine
7. Claude summarization (inline in webhook or separate function)
8. React pages: IntentForm, CallStatus, CallDetail, CallHistory
