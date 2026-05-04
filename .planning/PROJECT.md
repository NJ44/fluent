# Fluent

## What This Is

Fluent is a Personal Vocal Proxy for people who stutter. Instead of dreading a phone call, the user types their goal into the app, and an AI agent — speaking in the user's own cloned voice — makes the call for them. The user watches a live transcript while the AI handles the call, and can press one button to take over (barge in) at any moment. After the call, they get a one-sentence outcome summary and optional calendar sync.

## Core Value

The AI makes the call the second you hit Send — in your own voice, without ever stuttering.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can sign up and authenticate via email/password
- [ ] User completes one-time voice cloning onboarding (30-second ElevenLabs Instant Voice Clone)
- [ ] User can type a call intent and configure 2-3 what-if fallback rules
- [ ] App initiates an outbound AI phone call (Retell) using the user's cloned voice
- [ ] User watches a real-time transcript of the ongoing call
- [ ] User can barge in mid-call (mic goes live, AI goes silent) via Twilio Conference
- [ ] User receives a 1-sentence post-call outcome summary (Claude-generated)
- [ ] User can push outcome to Google Calendar
- [ ] Usage is gated by plan tier: Free (1/mo), Premium $19 (10/mo), Pro $49 (unlimited + voice clone)

### Out of Scope

- Mobile app (iOS/Android) — web-first, port after validation
- Inbound call handling — outbound task calls only in v1
- Multi-language support — English-first
- Team/enterprise features — solo user product in v1
- Real-time back-and-forth AI conversation with caller — one-way task execution only
- SMS or WhatsApp — phone calls only

## Context

**Technical stack (same as Boltcall):**
- React 19 + TypeScript + Vite + Tailwind + Radix UI + Zustand
- Netlify Functions (TypeScript) — all backend logic
- Supabase — auth + postgres + realtime (for live transcript streaming)
- Retell SDK — AI phone agent for outbound calls
- ElevenLabs Instant Voice Cloning API — 30s audio → voice_id → injected into Retell agent
- Twilio — outbound phone dialing + Conference room for barge-in

**Barge-in architecture:**
User is silently joined as a muted Conference participant via Twilio. When they hit "Barge-In," a Netlify function unmutes them and pauses the Retell agent.

**ElevenLabs voice cloning:**
ElevenLabs Instant Voice Cloning (IVC) API accepts an audio file upload and returns a `voice_id` within seconds. This voice_id is passed to the Retell agent config so all speech output uses the user's voice. Complexity: ~3 API calls total. Very v1-viable.

**Existing patterns to reuse from Boltcall (c:\Users\Asus\Desktop\Boltcall_website\Boltcall):**
- `netlify/functions/_shared/token-utils.ts` — Supabase admin client
- `netlify/functions/retell-calls.ts` — Retell SDK init + call patterns
- `netlify/functions/retell-agents.ts` — agent creation with ElevenLabs voice_id
- Auth context pattern

**Distribution strategy:**
- Stuttering communities: r/Stutter, Stuttering Foundation forums, NSA community
- Founder personal story: Noam shares stutter experience on LinkedIn + X

**Target user:**
People who stutter (roughly 1% of global population, ~80M people) who avoid phone calls due to phone anxiety and fear of blocking. Specifically adults who need to make practical calls: appointments, customer service, reservations.

## Constraints

- **Tech stack**: React 19 + Vite + Netlify + Supabase — matches Boltcall, reuse patterns
- **Platform**: Web first, mobile later — faster to ship, lower complexity
- **Voice cloning service**: ElevenLabs IVC — user has API access already
- **Billing**: PayPal (not Stripe) — consistent with Boltcall
- **Solo founder**: Solo build — phases must be scoped to avoid feature sprawl

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web-first (no mobile app) | Faster to ship, barge-in works via WebRTC browser mic | — Pending |
| Voice cloning in v1 | ElevenLabs IVC is simple (3 API calls), it's the emotional core differentiator | — Pending |
| Twilio Conference for barge-in | User joins as muted participant, unmute on demand — no custom phone infrastructure | — Pending |
| Supabase Realtime for transcript stream | Already in stack, zero extra infra for live transcript updates | — Pending |
| Full product in MVP | User confirmed all 4 layers (intent + clone + barge-in + vault) for v1 | — Pending |

---
*Last updated: 2026-05-04 after initialization*
