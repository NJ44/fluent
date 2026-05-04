# Pitfalls — Fluent

**Domain:** AI outbound phone call proxy with voice cloning and barge-in
**Researched:** 2026-05-04
**Confidence:** HIGH

---

## CRITICAL PITFALLS

### P1: Twilio + Retell race condition on first audio packets
**What breaks:** Twilio opens the media stream before Retell's WebSocket finishes negotiating. First ~500ms of AI speech is garbled or lost. Recipient hears "...ello, this is..." and hangs up. First impression fails.
**Root cause:** Twilio dials, returns TwiML, opens stream immediately. Retell's session WS is still connecting.
**Warning signs:** Garbled/truncated AI greeting in test calls. First word of every sentence sounds like it starts late.
**Prevention:**
- Buffer first 500ms of Twilio media chunks in queue, flush once Retell WS opens
- Map `callSid` ↔ `retell_call_id` immediately on stream connect
- Transcode audio at the edge: Twilio sends mulaw 8kHz, Retell expects PCM 16kHz
- Implement 200ms jitter buffer for dropped mobile packets
**Phase:** Phase 2 (Outbound Call Engine) — solve before any barge-in work

### P2: Missing AI disclosure at call start — TCPA / FCC violation
**What breaks:** FCC Feb 2024 confirmed TCPA applies to AI-generated voices. CA AB 2905 = $500/violation for missing disclosure. FL requires written consent for AI-initiated calls. September 2024 FCC NPRM proposes mandatory AI disclosure at call start.
**Root cause:** Founders don't want to "break the spell" with a robotic opener.
**Warning signs:** None until legal notice arrives. By then, calls × violations.
**Prevention:**
- Hard-code disclosure preamble into EVERY Retell call before task content: "Hi, this is an AI assistant calling on behalf of [user name] to schedule an appointment."
- Disclosure must be AUDIBLE and BEFORE the substantive request
- For two-party consent states (CA, CT, FL, IL, MD, MA, MT, NH, PA, WA): add recording disclosure
- Log a `disclosure_played: true` flag per call for legal defensibility
**Phase:** Phase 2 (Call Engine) — non-negotiable in v1, NOT "polish later"

### P3: Voice clone sounds nothing like the user (bad onboarding audio)
**What breaks:** First impression. User clones voice, hears a generic narrator, churns immediately. The entire product promise is dead.
**Root cause:**
- Spec says 30s minimum — ElevenLabs sweet spot is 60–120s
- Stutter blocks, room reverb, laptop mic, AC noise degrade quality more than duration
- Recording fluent audio is hard for someone who stutters
**Warning signs:** First-clone-rejected rate >25%. Support tickets: "That's not my voice."
**Prevention:**
- Require 60–120s of audio (not 30s). Reject below 45s with a retry UI.
- Client-side audio quality check before upload: peak RMS, noise floor, silence ratio
- Guide recording with a scripted passage designed to avoid hard-block phonemes
- Show sample sentence rendered in their clone BEFORE they commit ("Does this sound right?")
- Allow re-cloning from settings — never lock users into first clone
- Copy: "Record what's comfortable. We'll handle the fluency."
**Phase:** Phase 1 (Voice Clone Onboarding) — this IS the onboarding

### P4: User clones someone else's voice (abuse / impersonation)
**What breaks:** ElevenLabs ToS violation → account ban → all users' voices deleted → product offline. Potential criminal liability under voice-likeness laws (ELVIS Act, etc.). TCPA fraud exposure.
**Root cause:** ElevenLabs IVC has no automatic "is this your voice?" check at the IVC tier. Verification is on the API caller.
**Warning signs:** Multiple clone attempts per account, voice gender/age mismatch with account profile, repeated accounts from same IP.
**Prevention:**
- **Live mic recording only** — no file upload path in the clone onboarding flow
- Require randomized passphrase recorded live: "I, [name], on [date], consent to my voice being used by Fluent"
- Store passphrase recording as evidence (Supabase Storage, never deleted)
- ToS checkbox at clone time: "This is my voice. I'm not cloning anyone else."
- Manual review queue for: multiple re-clones, multiple accounts on same payment method
**Phase:** Phase 1 (Voice Clone Onboarding) — built into the flow, not bolted on

### P5: End-to-end call latency >1.5 seconds
**What breaks:** Natural human turn-taking is ~200ms. At 1.5s, callers think the line dropped. At 2s+, they hang up or ask "hello?" repeatedly.
**Root cause:** Fluent's stack stacks latency: Twilio → Retell → LLM inference (40-60% of latency) → ElevenLabs TTS → back to Twilio. IVC voices are SLOWER than default ElevenLabs voices.
**Warning signs:** Recipient hangs up during AI's first response. "Hello? Hello?" in transcripts.
**Prevention:**
- Use ElevenLabs Flash v2.5 model with `optimize_streaming_latency=3`
- WebSocket streaming for TTS, not HTTP request/response
- Keep TTS input chunks under 1000 characters
- Pre-warm Retell WS while user is still typing intent — don't wait for "Send"
- Set Retell `interruption_sensitivity` to 0.5–0.7 (default 0.3 is too low)
- Benchmark target: <800ms total. Alert at >1200ms.
- All benchmarks MUST use IVC voice, not default voice
**Phase:** Phase 2 (Call Engine) — measure every leg from day 1

---

## MODERATE PITFALLS

### P6: Two-party consent recording disclosure (11 states)
**What breaks:** California, CT, FL, IL, MD, MA, MT, NH, PA, WA require both parties to consent to recording. Retell records by default.
**Prevention:**
- Default to "both parties" disclosure in preamble regardless of state (safer baseline)
- Add: "This call may be recorded for quality."
- Geographic check: if either caller OR callee is in a two-party state, recording disclosure is mandatory
- Store consent flag per call
**Phase:** Phase 2 — disclosure script must exist from day one

### P7: WebRTC mic permission denied — user trapped mid-call
**What breaks:** User hits "Barge-In." Browser prompts for mic. They deny (or denied earlier). AI keeps talking. User can't take over. Panic.
**Root cause:** iOS Safari: permission can be denied at OS level, browser level, or site level. `NotAllowedError` doesn't tell you which.
**Warning signs:** "Barge-in button doesn't work" reports. iOS-specific complaints.
**Prevention:**
- Request mic permission at **app load**, NOT at barge-in time
- Pre-flight check: verify `getUserMedia` succeeds before allowing a call to start. Block call start with a fix-it modal if it fails.
- Show a persistent banner if mic is blocked: "Your microphone is blocked. Barge-in won't work. [Fix it]" with OS-specific instructions
- Provide a separate "End call" kill-switch that works WITHOUT mic (terminates the Twilio call)
- Detect iOS/Safari and show specific privacy settings instructions
**Phase:** Phase 3 (Barge-In) — pre-flight check is part of the barge-in feature

### P8: Netlify Function cold start drops Retell webhooks
**What breaks:** Retell has a ~10s webhook timeout, retries 3×. A cold Netlify function spins up in 1–3s, then you add db init + verification + business logic. Near or over timeout, especially at low traffic (always cold at launch).
**Warning signs:** Retell webhook delivery success rate < 99% in Retell dashboard.
**Prevention:**
- Return `{ statusCode: 200, body: JSON.stringify({ ack: true }) }` IMMEDIATELY, BEFORE any processing
- Move heavy processing (Claude summary, calendar push, Supabase writes beyond the ack) to Netlify Background Functions (15min timeout) or a Supabase queue table
- Implement webhook idempotency: `webhook_events(provider, event_id)` unique index — `ON CONFLICT DO NOTHING`
- Pre-warm critical functions with a cron that pings `/health` every 5 minutes
**Phase:** Phase 1 (Foundation) — set the webhook pattern correctly from the start

### P9: Live transcript lags 2–4 seconds behind audio
**What breaks:** User reads transcript, decides to barge in based on what they just read. But the AI already moved on. They interrupt at the wrong moment, creating awkward overlap.
**Warning signs:** User barge-ins that feel mistimed in the recording. User feedback: "I pressed the button but it was too late."
**Prevention:**
- Use Supabase Broadcast (not just Postgres Changes) for lowest latency updates. Broadcast doesn't single-thread under load.
- Stream interim transcripts (Deepgram interim results at ~150ms) for optimistic UI updates; finalize after
- Visually distinguish "AI just said" from "AI is currently saying" — show a typing indicator on active turn
- Show transcript timestamps relative to call start, not wall clock
**Phase:** Phase 3 (Live Transcript)

---

## MINOR PITFALLS

### P10: IVC voice is slower than default ElevenLabs voices
**What breaks:** Latency benchmarks done with default voices look fine; IVC voice adds latency that breaks the budget.
**Prevention:** Run ALL benchmarks with IVC voice selected. Never assume parity.
**Phase:** Phase 2

### P11: User stutters in their own clone recording (ironic failure mode)
**What breaks:** ElevenLabs clones EVERYTHING: speed, inflections, breathing, blocks. A user who stutters in the 30s sample gets a clone that also stutters on certain phonemes.
**Warning signs:** User hears clone and says "it still sounds like I'm stuttering." Churn.
**Prevention:**
- Multiple short scripted prompts (5×15s, not 1×60s) — let user retry each segment
- Provide warm-up text designed to avoid hard-block phonemes
- Allow user to trim/edit recording before submitting
- Copy: "Record what's comfortable. We'll make it fluent."
**Phase:** Phase 1 (Onboarding) — deeply ironic failure, address in copy + flow

### P12: Post-call summary blocks UI for 5–8 seconds
**What breaks:** Call ends. User stares at spinner. Feels broken.
**Prevention:** Generate summary async (Background Function). Show "Generating summary…" immediately. Push via Supabase Realtime when ready. User can navigate away and return.
**Phase:** Phase 2

### P13: Calendar push fails silently
**What breaks:** User sees green checkmark. Event never lands in calendar.
**Prevention:** Read back `event.id` from Google Calendar API. Show "View in Google Calendar" link as confirmation. Refresh tokens proactively.
**Phase:** Phase 5 (Calendar sync feature)

---

## Phase Mapping

| Phase | Key Pitfalls |
|-------|-------------|
| Phase 1 — Onboarding | P3 (bad clone audio), P4 (clone abuse), P11 (stutter in recording), P8 (webhook cold start) |
| Phase 2 — Call Engine | P1 (audio race), P2 (TCPA disclosure), P5 (latency), P6 (two-party consent), P10 (IVC slower), P12 (async summary) |
| Phase 3 — Barge-In | P7 (mic permission), P9 (transcript lag) |
| Phase 5 — Polish | P13 (calendar sync) |

---

## Sources
- [Retell AI Webhook Overview](https://docs.retellai.com/features/webhook-overview)
- [Retell AI Twilio Integration](https://docs.retellai.com/deploy/twilio)
- [ElevenLabs IVC docs](https://elevenlabs.io/docs/creative-platform/voices/voice-cloning/instant-voice-cloning)
- [ElevenLabs Latency Optimization](https://elevenlabs.io/docs/eleven-api/guides/how-to/best-practices/latency-optimization)
- [ElevenLabs Prohibited Use Policy](https://elevenlabs.io/use-policy)
- [FCC Confirms TCPA Applies to AI Voices](https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices)
- [California AB 2905 AI Transparency Act](https://www.mayerbrown.com/en/insights/publications/2025/10/new-obligations-under-the-california-ai-transparency-act-and-companion-chatbot-law-add-to-the-compliance-list)
- [State-by-State Call Recording Compliance](https://hostie.ai/resources/state-by-state-call-recording-compliance-ai-virtual-hosts-2025)
- [Twilio Conference Participant Resource](https://www.twilio.com/docs/voice/api/conference-participant-resource)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [WebRTC Safari Guide](https://webrtchacks.com/guide-to-safari-webrtc/)
- [Netlify Function Timeout](https://damianwroblewski.com/en/blog/how-to-bypass-the-netlify-serverless-function-timeout/)
- [Voice AI Latency Benchmarks](https://www.trillet.ai/blogs/voice-ai-latency-benchmarks)
