# Stack Research — Fluent

**Domain:** Web-based AI phone call proxy with voice cloning and barge-in
**Researched:** 2026-05-04
**Confidence:** HIGH overall, MEDIUM on Retell+IVC voice injection and Twilio Conference SIP bridge

---

## TL;DR — Two Critical Gotchas

### Gotcha 1: Retell does NOT support BYOK for ElevenLabs private IVC voices
A private IVC voice cloned under your ElevenLabs account cannot be selected in a Retell agent. Confirmed February 2026 in Retell community forums.

**Recommended swap:** Use **Retell's native voice cloning** (upload audio directly to Retell → get a Retell-internal `voice_id` usable in `agent_override`). ElevenLabs IVC is a great technology but the BYOK integration path with Retell doesn't exist in v1. Alternatively, IVC voices can be made public on ElevenLabs and then imported into Retell by ID — but that's a privacy concern for end users.

### Gotcha 2: Retell cannot be directly "added" to a Twilio Conference via REST
Retell controls its call leg via SIP trunking. The correct architecture is Twilio-owns-the-Conference, Retell-SIPs-in — not the reverse.

---

## Recommended Stack

### Frontend
| Tech | Version | Why |
|------|---------|-----|
| React | 19.x | Stable, matches Boltcall, Suspense/concurrent features available |
| TypeScript | 5.6+ | Strict mode, consistent with Boltcall |
| Vite | 7.x | Fastest DX, ~42KB bundle vs ~92KB Next.js, no SSR complexity needed for private SaaS |
| Tailwind | 3.x | Reuse Boltcall design system |
| Radix UI + Zustand | latest | Reuse Boltcall component/store patterns |
| `@twilio/voice-sdk` | 2.x | Browser WebRTC for barge-in mic — required for Conference participant |

**Verdict:** React 19 + Vite + Netlify is correct for a private-dashboard SaaS. Next.js would be over-engineering for an authenticated product with no SEO surface.

### Backend
| Tech | Version | Why |
|------|---------|-----|
| Netlify Functions | Node 20+, TS | Same as Boltcall, zero new infra |
| Supabase | latest (postgres 15+) | Auth + Postgres + Realtime — one system |
| `@supabase/supabase-js` | 2.x | Realtime channel API |

### Voice / Telephony
| Tech | Why |
|------|-----|
| Retell SDK (`retell-sdk` Node) | Outbound AI agent — `createPhoneCall` with `agent_override` |
| **Retell native voice cloning** | Recommended SWAP from ElevenLabs IVC — avoids BYOK friction |
| ElevenLabs IVC | Fallback only if user makes voice public on ElevenLabs |
| Twilio REST + Voice JS 2.x | Conference room + browser WebRTC participant |
| `twilio` Node SDK | 5.x — TwiML and REST |

### Billing
| Tech | Why |
|------|-----|
| PayPal Subscriptions API | Per global rule (PayPal not Stripe) |

---

## ElevenLabs Instant Voice Cloning API

**Endpoint:** `POST https://api.elevenlabs.io/v1/voices/add`
**Auth:** `xi-api-key` header
**Content-Type:** `multipart/form-data`
**Required fields:** `name` (string), `files` (one or more audio files)
**Response:** `{ "voice_id": "string", "requires_verification": boolean }`

**Audio requirements:**
- **Length:** 1–2 minutes is the sweet spot. 30 seconds technically works but is the quality lower-bound. Avoid >3 minutes.
- **Format:** MP3 at 128–192 kbps strongly recommended. WAV also accepted. Mono fine.
- **Quality over duration:** No reverb, no background noise, single speaker, consistent volume.

**TTS models by latency:**
- `eleven_flash_v2_5`: ~75ms model latency — best for real-time phone use
- `eleven_turbo_v2`: balanced
- `eleven_multilingual_v2`: highest quality, higher latency

**Recommendation for phone calls:** Flash v2.5 + IVC voice is the latency/quality sweet spot.

---

## Retell `createPhoneCall` API

**Endpoint:** `POST https://api.retellai.com/v2/create-phone-call`

```ts
await client.call.createPhoneCall({
  from_number: '+1...',
  to_number: '+1...',
  agent_override: {
    agent: {
      voice_id: 'retell-cloned-voice-id',  // Retell native clone
      voice_model: 'eleven_flash_v2_5',
    }
  },
  retell_llm_dynamic_variables: { call_intent: '...', fallbacks: '...' }
});
```

**IVC gotcha:** Use `retell_sdk.voice_clone()` to upload audio directly to Retell and get a Retell-internal `voice_id`. This IS selectable in `agent_override`. ElevenLabs IVC → Retell is NOT supported without making the voice public.

---

## Twilio Conference for Barge-In

**Architecture: Twilio owns the Conference, Retell SIPs in.**

### Setup flow
1. Browser joins Conference via Twilio Voice JS SDK as muted participant
2. Netlify dials recipient via `Calls.create()` → TwiML routes into Conference (`startConferenceOnEnter="true"`)
3. Netlify dials Retell via SIP: `sip:<agent_id>@sip.retellai.com` as third participant

### TwiML for Conference
```xml
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="false" beep="false"
                statusCallback="https://.../twilio-webhook"
                statusCallbackEvent="join leave mute">
      fluent-{call_id}
    </Conference>
  </Dial>
</Response>
```

### Browser joins muted
```ts
import { Device } from '@twilio/voice-sdk';
const device = new Device(accessToken); // short-lived token from /voice-token fn
const call = await device.connect({ params: { ConferenceName: 'fluent-{call_id}', StartMuted: 'true' } });
```

### Barge-in unmute via REST
```
PATCH /Accounts/{Sid}/Conferences/{ConfSid}/Participants/{CallSid}.json
Body: Muted=false
```

---

## Supabase Realtime for Transcript Streaming

**Recommended pattern:** `postgres_changes` subscription on `transcript_events` table.

```ts
// Backend: INSERT per transcript chunk from Retell webhook
await supabaseAdmin.from('transcript_events')
  .insert({ call_id, seq, role, text, ts: Date.now() });

// Frontend: subscribe
supabase.channel(`transcript:${callId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'transcript_events',
      filter: `call_id=eq.${callId}` },
    (payload) => setTranscript(t => [...t, payload.new])
  ).subscribe();
```

**Required SQL:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE transcript_events;
ALTER TABLE transcript_events ENABLE ROW LEVEL SECURITY;
```

**Broadcast vs Postgres Changes:** At v1 scale (1 user per call), `postgres_changes` is correct — simpler, has persistence for reconnect. Switch to Broadcast if you hit RLS bottleneck at scale.

---

## Sources
- [Retell create-phone-call API](https://docs.retellai.com/api-references/create-phone-call)
- [Retell community: BYOK not supported](https://community.retellai.com/t/enable-elevenlabs-byok-private-voice-clone-not-selectable/886)
- [Retell Twilio SIP integration](https://docs.retellai.com/deploy/twilio)
- [ElevenLabs IVC API ref](https://elevenlabs.io/docs/api-reference/voices/ivc/create)
- [ElevenLabs latency guide](https://elevenlabs.io/docs/eleven-api/concepts/latency)
- [TwiML Conference reference](https://www.twilio.com/docs/voice/twiml/conference)
- [Twilio Voice JS SDK](https://www.twilio.com/docs/voice/sdks/javascript)
- [Supabase postgres_changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Vite on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
