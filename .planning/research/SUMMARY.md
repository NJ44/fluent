# Project Research Summary

**Project:** Fluent — AI phone call proxy for people who stutter
**Domain:** Consumer accessibility SaaS / multi-leg telephony orchestration with voice cloning
**Researched:** 2026-05-04
**Confidence:** HIGH overall (MEDIUM on Retell ↔ Twilio Conference SIP bridge)

---

## Executive Summary

Fluent sits at the intersection of AI phone agents (Bland/Retell), consumer voice cloning (ElevenLabs), and accessibility utilities (Apple Personal Voice). No competitor combines all three. The wedge: the user's own cloned voice makes the call, with watch-and-intervene barge-in as the emotional safety net.

The stack mirrors Boltcall's existing infrastructure (React 19 + Vite + Netlify + Supabase) with telephony additions (Retell + Twilio). **Critical stack gotcha: Retell does NOT support BYOK ElevenLabs IVC voices — the recommended swap is Retell's native voice cloning API.** The core architectural insight: **Twilio owns the Conference, Retell SIPs in** — the only viable three-leg design where the user's browser participates as a muted listener.

The dominant risks are regulatory and perceptual, not technical. TCPA/FCC mandate AI disclosure preambles from day one. Voice clone quality must be gated at onboarding (live mic only, 60–120s, passphrase consent). End-to-end latency must stay under 1.5s.

---

## Key Findings

### Recommended Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind | Matches Boltcall, no SSR needed |
| Backend | Netlify Functions (Node 20+ TS) | Stateless, zero new infra |
| Database + Auth | Supabase (Postgres 15+) | Auth + Realtime + Storage in one |
| AI agent | Retell SDK | `createPhoneCall` + `agent_override` |
| Voice cloning | **Retell native clone API** | ElevenLabs IVC BYOK not supported in Retell |
| Phone infra | Twilio Voice JS SDK 2.x + Node SDK 5.x | Browser WebRTC + Conference REST |
| TTS model | ElevenLabs Flash v2.5 | ~75ms latency — only viable model for live phone |
| AI parsing | Claude API | Intent parsing + post-call summary |
| Billing | PayPal Subscriptions API | Per global rule |

### Key Gotchas
- **ElevenLabs IVC private voices are NOT selectable in Retell** (confirmed Feb 2026). Must use Retell's native clone endpoint OR make the voice public on ElevenLabs (privacy concern).
- **Retell cannot be REST-added to a Twilio Conference** — it joins via SIP at `sip:<agent_id>@sip.retellai.com`.
- **IVC voices are slower than default ElevenLabs voices** — all latency benchmarks must use IVC, never default.

---

## Expected Features

**Table stakes (missing any breaks trust):**
- Email/password auth + guided voice clone onboarding with sample playback
- Type call intent + explicit what-if fallback rules
- Outbound call with <1.5s response latency
- Real-time live transcript (Supabase Realtime)
- One-button barge-in (large, always visible, <300ms perceived, no confirmation dialog)
- Distinct kill-switch (works WITHOUT mic permission)
- Post-call outcome card + 1-sentence Claude summary
- AI self-disclosure at call start (TCPA/FCC mandatory, non-negotiable)
- Voice clone is private, deletable, never shared

**Differentiators:**
- Cloned voice ("It's YOUR voice on the phone" — no consumer AI phone agent has this)
- Visible, editable what-if fallback rules (AI Haggler does this implicitly; making it explicit wins)
- Watch + intervene paradigm (no consumer AI phone agent has user-takeover mode)
- One-tap calendar sync (closes the loop; manual re-entry kills the magic)
- Dignity-first copy: "make the call without the call making you"

**Anti-features (never build):** Inbound calls, real-time AI conversation, therapy/fluency features, team accounts, voice personality sliders, in-app call-count analytics, public voice marketplace, auto-retry without user prompt, fake disfluencies.

---

## Architecture Approach

Three audio legs converge in one Twilio Conference:
1. **User's browser** — Twilio Voice JS SDK, joins muted
2. **Recipient** — standard Twilio outbound dial
3. **Retell agent** — joins via SIP (`sip:<agent_id>@sip.retellai.com`)

Netlify Functions are stateless. Supabase Postgres = state of record. Webhooks (Twilio + Retell) = synchronizers. Supabase Realtime `postgres_changes` = transcript stream to browser (SSE disqualified by 10s Netlify cap; polling too expensive).

**Key patterns:**
- Browser only sees Supabase anon key + short-lived Twilio Voice Access Token
- Webhook 200-OK before processing; heavy work in Background Functions
- Idempotency: `webhook_events(provider, event_id)` UNIQUE + `ON CONFLICT DO NOTHING`
- State transitions: `UPDATE ... WHERE status IN ('expected_priors')` — first-write-wins

---

## Critical Pitfalls

| # | Pitfall | Prevention | Phase |
|---|---------|-----------|-------|
| P1 | **Twilio+Retell audio race** — first 500ms garbled | Buffer media, flush on Retell WS open; transcode mulaw→PCM | 2 |
| P2 | **TCPA/FCC violation** — missing AI disclosure | Hard-code preamble in EVERY call before task content. Log `disclosure_played`. | 2 (not "later") |
| P3 | **Bad clone audio** — sounds nothing like user | Live mic only, 60–120s, audio quality pre-check, passphrase, sample playback | 1 |
| P4 | **Clone abuse/impersonation** | Live mic only + consent passphrase + store evidence forever | 1 |
| P5 | **Latency >1.5s** — recipients hang up | Flash v2.5 + optimize_streaming_latency=3 + pre-warm Retell WS while user types | 2 |
| P7 | **Mic permission denied mid-call** | Request mic at app load; pre-flight check; kill-switch independent of mic | 3 |
| P8 | **Netlify cold start drops webhooks** | 200 OK immediately, defer work to Background Functions, pre-warm cron | 1 |

---

## Implications for Roadmap

**6 phases, risk-staged:**

| Phase | Focus | Key Rationale |
|-------|-------|---------------|
| 1 | Auth + Voice Clone Foundation | Voice clone IS the product. Validate standalone before any call complexity. |
| 2 | Outbound Call Engine (no browser audio) | Prove Retell + Twilio + cloned voice end-to-end. TCPA disclosure mandatory here. |
| 3 | Live Transcript Streaming | Builds the substrate barge-in needs. Validate Realtime latency on its own. |
| 4 | Browser Audio Leg (HIGHEST RISK) | Three-leg Conference with user's browser. Most architectural unknown — sequenced after core is proven. |
| 5 | Barge-In Control | Mute-toggle problem once all three legs are in Conference. Latency-sensitive. |
| 6 | Calendar + Billing + Polish | Commercial viability and error states. PayPal not Stripe. |

**Phases needing extra research at planning time:**
- Phase 1: Retell native clone API exact shape (spike before committing onboarding UI)
- Phase 2: Audio race buffer/transcode pattern + latency benchmark with IVC voice
- Phase 4: Three-leg Conference Retell-SIP spike before full phase commit

**Phases that can skip research:**
- Phase 3: Standard Supabase Realtime, matches Boltcall patterns
- Phase 6: Standard PayPal subscriptions + Google Calendar OAuth

---

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Stack | HIGH | All vendors documented; Boltcall precedent. MEDIUM only on Retell native clone API exact shape. |
| Features | MEDIUM-HIGH | Strong domain framing + competitor mapping. |
| Architecture | HIGH | Twilio Conference + Supabase Realtime well-documented. MEDIUM on Retell SIP-into-Conference (community-confirmed, no canonical example). |
| Pitfalls | HIGH | TCPA/FCC primary sources, ElevenLabs ToS direct, latency benchmarks, audio race from multiple Retell community threads. |

---

*Research completed: 2026-05-04 | Ready for roadmap: yes*
