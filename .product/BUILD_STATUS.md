# Fluent — Build Status

## Current State (as of 2026-05-05)

**Phase 2 of 5 complete (pending live QA checkpoint)**

Phase 1 and Phase 2 are fully coded and tested. The app is not yet deployed. The user (Noam) needs to fill in `.env` secrets and run the live QA call to close Phase 2.

## Phase Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Auth + Voice Clone Foundation | ✅ Complete | 5/5 done |
| 2 | Outbound Call Engine | 🔶 Code done, QA pending | 5/6 done (02-06 = live call checkpoint) |
| 3 | Live Transcript Streaming | ⬜ Not started | TBD plans |
| 4 | Browser Audio Leg + Barge-In | ⬜ Not started (HIGHEST RISK) | TBD plans |
| 5 | Billing + Calendar + Retry | ⬜ Not started | TBD plans |

## What's Built (Phase 1 + 2)

### Authentication
- Email/password sign up and sign in via Supabase Auth
- Session persistence across refresh
- Protected routes (redirect to /sign-in if unauthenticated)
- Redirect to /onboarding if no active voice clone

### Voice Cloning
- In-browser audio recording (MediaRecorder API, 60–120s)
- Scripted passage (avoids hard-block phonemes)
- Client-side audio quality gate (noise floor, silence ratio, volume)
- Randomized consent passphrase recording (VOICE-04 compliance)
- ElevenLabs IVC upload → voice_id stored
- Cloned voice playback confirmation before saving
- Re-clone and delete from Settings (GDPR-compliant)
- Voice is RLS-private to owning user

### Outbound Call Engine
- IntentForm: intent text + E.164 phone + consent checkbox + what-if rules
- Submit blocked when no active voice clone (amber banner instead)
- initiate-call Netlify function: validates → inserts call → creates/gets Retell agent → dials → ringing
- setup-retell-agent: lazy-creates one RetellLLM + Voice Agent per user; caches in voice_clones
- TCPA begin_message hardcoded and fires first
- retell-webhook: HMAC signature verification → state machine updates → async Claude summarization
- CallDetail page: status timeline + polling + transcript view + outcome summary + failure messages
- CallHistory page: all past calls, status badges, navigate to detail
- Zustand callStore: currentCallId + currentStatus
- Full test suite: 57 tests passing, 1 skipped

### Supabase Project
- Project ID: voermsyzakngbllmqlvc
- Region: us-east-1
- Org: azvtvlvokjvkzpspbthu
- Migrations applied: 5 (auth setup, voice_clones, RLS, calls table, retell_agent columns)
- Storage bucket: voice-evidence (private)
- Realtime enabled on calls table

## What's NOT Built Yet

| Feature | Phase | Requirement |
|---------|-------|-------------|
| Real-time transcript streaming | 3 | LIVE-01, LIVE-02 |
| Mic permission at app load + banner | 3 | LIVE-06 |
| Browser audio leg (Twilio Voice JS) | 4 | LIVE-03 |
| Barge-in button (unmute + pause Retell) | 4 | LIVE-04 |
| Kill-switch (end call no mic) | 4 | LIVE-05 |
| Plan tier enforcement (usage limits) | 5 | CALL-04, BILL-01–06 |
| Google Calendar push | 5 | POST-03, POST-04 |
| Call retry from post-call screen | 5 | POST-05 |
| Call history pagination | 5 | HIST-03 |
| PayPal subscriptions | 5 | BILL-06 |
| Quota display on dashboard | 5 | BILL-04 |

## Pending Before Phase 3 Can Start

1. Fill `.env` with real secrets:
   - `SUPABASE_SERVICE_KEY` — from Supabase dashboard > Settings > API
   - `RETELL_API_KEY` — from Retell dashboard
   - `ANTHROPIC_API_KEY` — from Anthropic console
   - `RETELL_FROM_NUMBER` — Twilio number in E.164, purchased and configured in Retell

2. Run `npm run dev` and complete live call test:
   - Sign up → onboard → submit intent → verify TCPA preamble fires first → watch transcript → read summary → check call history

3. Type "approved" to close 02-06 checkpoint and trigger Phase 2 verification

4. After gsd-verifier passes → `/gsd:plan-phase 3` to start Phase 3

## Repository

- **Working directory:** `c:\Users\Asus\Desktop\Fluent`
- **Git:** master branch
- **Untracked files needing commit:** landing page UI files (`src/pages/HomePage.tsx`, `src/components/ui/cinematic-landing.tsx`, `src/components/ui/fishy-button.tsx`, `src/components/ui/fluent-footer.tsx`, etc.)

## Key File Locations

| File | Purpose |
|------|---------|
| `netlify/functions/initiate-call.ts` | Outbound call trigger |
| `netlify/functions/setup-retell-agent.ts` | Retell agent lazy-creation + caching |
| `netlify/functions/retell-webhook.ts` | Webhook state machine + async summarization |
| `netlify/functions/_shared/verify-signatures.ts` | HMAC webhook verification |
| `netlify/functions/_shared/auth-utils.ts` | Bearer token verification |
| `netlify/functions/_shared/token-utils.ts` | Supabase admin client factory |
| `src/components/IntentForm.tsx` | Call intent submission UI |
| `src/pages/CallDetail.tsx` | Live + post-call unified view |
| `src/pages/CallHistory.tsx` | All past calls list |
| `src/store/callStore.ts` | Zustand: active call state |
| `src/types/calls.ts` | CallStatus types + utilities |
| `src/contexts/AuthContext.tsx` | Supabase auth session |
| `supabase/migrations/` | All DB migrations |

---
*Created: 2026-05-05*
