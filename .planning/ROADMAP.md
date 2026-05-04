# Roadmap: Fluent

**Granularity:** standard
**Phases:** 5
**Requirements mapped:** 44/44
**Created:** 2026-05-04

## Overview

Fluent ships in 5 phases. Phase 1 validates the emotional core: a signed-in user records their voice and owns a private clone ready for calls. Phase 2 proves the full outbound call loop — cloned voice dials out, TCPA-compliant, with real outcome summaries and call history — using a single audio leg with no browser audio yet. Phase 3 adds the live transcript stream and resolves microphone permissions at app load, building the substrate Phase 4 needs. Phase 4 is the project's highest-risk phase: the user's browser joins a three-leg Twilio Conference alongside the Retell SIP agent and the recipient, and the barge-in button and kill-switch become live user controls. Phase 5 closes the commercial loop: plan-tier enforcement, PayPal subscriptions, Google Calendar sync, call retry, and call history pagination.

## Phases

- [ ] **Phase 1: Auth + Voice Clone Foundation** - Signed-in user records, validates, and owns a private cloned voice ready for use
- [ ] **Phase 2: Outbound Call Engine** - Cloned-voice AI call placed end-to-end with TCPA disclosure, post-call summary, stored transcript, and call history
- [ ] **Phase 3: Live Transcript Streaming** - Real-time call transcript streams to the browser; microphone permissions resolved at app load
- [ ] **Phase 4: Browser Audio Leg + Barge-In** - Three-leg Twilio Conference with browser audio; one-button barge-in (<300ms) and kill-switch live (HIGHEST RISK)
- [ ] **Phase 5: Billing + Calendar + Retry** - Plan-tier enforcement, PayPal subscriptions, Google Calendar push, call retry, history pagination

## Phase Details

### Phase 1: Auth + Voice Clone Foundation
**Goal**: A signed-in user can record a live in-browser voice sample, pass audio quality and consent gates, hear their cloned voice played back, and own a private deletable clone — with no file-upload path and no sharing possible.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, VOICE-07, VOICE-08
**Success Criteria** (what must be TRUE):
  1. A new user can create an account with email/password, sign out, and have their session persist across browser refresh and tab close; unauthenticated visits to gated routes redirect to sign-in.
  2. A signed-in user can record a 60–120s live in-browser sample using a scripted passage (no file upload path available), receive a client-side audio quality pass/fail before submission, and complete a randomized consent passphrase recording.
  3. After cloning, the user hears a sample sentence played back in their cloned voice and can confirm or restart the recording before the clone is saved.
  4. From Settings, the user can re-clone at any time (old clone superseded, not overwritten) or permanently delete the clone with all associated audio — verifiably GDPR-compliant.
  5. The cloned voice is never accessible to any other user; it is private to the owning user and the service role only.
**Plans**: TBD

### Phase 2: Outbound Call Engine
**Goal**: A user with a valid clone can submit a call intent with fallback rules, an outbound AI call is placed in their cloned voice with mandatory TCPA disclosure, the full call lifecycle is tracked, and the user ends up with a Claude-generated outcome summary, a stored transcript, and a browseable call history.
**Depends on**: Phase 1
**Requirements**: INTENT-01, INTENT-02, INTENT-03, INTENT-04, CALL-01, CALL-02, CALL-03, CALL-05, CALL-06, CALL-07, CALL-08, POST-01, POST-02, HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. A user can type a plain-English call goal, enter a recipient phone number, and add 2–3 fallback rules; the Submit button is blocked when no active voice clone exists.
  2. On submit, an outbound call is placed using the user's cloned voice; the call opens with a hardcoded AI-disclosure preamble and a recording-disclosure statement before any task content is spoken.
  3. The call's lifecycle (draft → initiating → ringing → active → ended → analyzed) is tracked in real time; end-to-end AI response latency is under 1.5s with the IVC voice; failure states (no answer, busy, voicemail, error) surface a clear user-facing message rather than a crash or silent hang.
  4. After the call ends, the user receives a 1-sentence Claude-generated outcome summary and can open and read the full stored transcript.
  5. The user can view a list of past calls (intent, outcome, date, status) and open any entry to see its full transcript.
**Plans**: TBD

### Phase 3: Live Transcript Streaming
**Goal**: While a call is active, the user watches a real-time transcript update in the browser with the AI's current turn visually distinguished from completed turns; microphone permission is requested at app load and a persistent actionable banner surfaces if denied.
**Depends on**: Phase 2
**Requirements**: LIVE-01, LIVE-02, LIVE-06
**Success Criteria** (what must be TRUE):
  1. During an active call, new transcript turns appear in the browser within sub-second of the AI or recipient speaking, streamed via Supabase Realtime.
  2. The transcript visually distinguishes the AI's currently-active turn from completed turns at a glance without requiring any user action.
  3. On first app load, the browser requests microphone permission once; if denied, a persistent banner explains what will be impacted and provides OS-specific instructions for how to grant it.
**Plans**: TBD

### Phase 4: Browser Audio Leg + Barge-In
**Goal**: During an active call, the user's browser is silently joined as a muted participant in a Twilio Conference alongside the Retell SIP agent and the recipient; the user can press one always-visible button to go live (AI mutes, mic activates) in under 300ms, and can press a distinct kill-switch to end the call without requiring microphone access.
**Depends on**: Phase 3
**Requirements**: LIVE-03, LIVE-04, LIVE-05
**Success Criteria** (what must be TRUE):
  1. When a call starts, the user's browser silently joins the Twilio Conference as a muted participant via the Twilio Voice JS SDK using a short-lived access token; all three legs (browser, Retell SIP agent, recipient) are confirmed in Conference state.
  2. During an active call, the "Barge-In" button is always visible; pressing it unmutes the user's microphone and mutes the Retell agent within 300ms perceived response time.
  3. A distinct "End Call" kill-switch terminates the call immediately without requiring microphone access — it works even if the user previously denied mic permission.
**Plans**: TBD

> HIGHEST RISK PHASE: The Retell agent joins via SIP (`sip:<agent_id>@sip.retellai.com`). This three-leg Conference architecture is community-confirmed but has no canonical Retell example. Research recommends running a Retell-SIP Conference spike before committing the full phase plan.

### Phase 5: Billing + Calendar + Retry
**Goal**: Plan-tier call limits are enforced before each call, PayPal subscriptions handle upgrades and downgrades, call outcomes can be pushed to Google Calendar with one tap, users can retry a call from the post-call screen, and call history handles large lists without degrading.
**Depends on**: Phase 4
**Requirements**: CALL-04, POST-03, POST-04, POST-05, HIST-03, BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06
**Success Criteria** (what must be TRUE):
  1. Plan-tier limits are enforced before a call is initiated (Free: 1/mo, Premium: 10/mo, Pro: unlimited); a user who has hit their limit sees an upgrade prompt, not a generic error.
  2. The user's remaining call quota is visible prominently on the dashboard at all times.
  3. PayPal subscription integration handles plan upgrades and downgrades end-to-end without manual intervention.
  4. After a call ends, the user can push the outcome to Google Calendar in one tap and see a "View in Google Calendar" link confirming the event was created.
  5. The user can retry a call with the same intent or an edited version directly from the post-call screen.
  6. Call history pages or infinitely scrolls cleanly for users with large call lists with no UI jank and no over-fetching.
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth + Voice Clone Foundation | 2/5 | In progress | - |
| 2. Outbound Call Engine | 0/TBD | Not started | - |
| 3. Live Transcript Streaming | 0/TBD | Not started | - |
| 4. Browser Audio Leg + Barge-In | 0/TBD | Not started | - |
| 5. Billing + Calendar + Retry | 0/TBD | Not started | - |

---

## Risk Flags

| Phase | Risk | Source |
|-------|------|--------|
| 1 | Retell native clone API exact shape is unknown — spike before committing onboarding UI | research/SUMMARY.md |
| 2 | Audio race (first 500ms garbled), TCPA disclosure correctness, latency >1.5s with IVC voice | research/SUMMARY.md pitfalls P1, P2, P5 |
| 4 | Retell SIP-into-Twilio-Conference is MEDIUM confidence — run spike before full phase plan | research/SUMMARY.md |
| 4 | Barge-in <300ms perceived latency budget is tight | LIVE-04 requirement |
| All | Mic permission denied at barge-in time (resolve in Phase 3), webhook cold-start drops 200 OK | research/SUMMARY.md pitfalls P7, P8 |

---
*Roadmap created: 2026-05-04*
