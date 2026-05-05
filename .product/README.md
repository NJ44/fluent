# Fluent — Product Knowledge Base

This folder contains the authoritative product context for Fluent. Read this first at the start of any session before making product decisions or writing code.

## Files

| File | Contents |
|------|---------|
| [MISSION.md](MISSION.md) | What Fluent is, why it exists, core value proposition, what it is NOT |
| [ICP.md](ICP.md) | Ideal Customer Profile — who stutters, their pain, triggers, fears, where they live online |
| [OFFER.md](OFFER.md) | Product tiers, pricing, what's included, emotional pitch, competitive framing |
| [FUNDAMENTALS.md](FUNDAMENTALS.md) | How the product works end-to-end, tech architecture, DB schema, key constraints |
| [DISTRIBUTION.md](DISTRIBUTION.md) | GTM strategy, community-led acquisition, channels, funnel, metrics |
| [BUILD_STATUS.md](BUILD_STATUS.md) | What's built, what's not built, current phase, next steps, file map |

## One-Paragraph Summary

Fluent is a Personal Vocal Proxy for people who stutter. The user types their call intent, an AI agent calls in the user's ElevenLabs-cloned voice, the user watches the live transcript, and can barge in with one button. After the call: a 1-sentence Claude-generated outcome summary. Built by Noam (solo founder, 23, Israel, personal stutter experience) on React 19 + Vite + Supabase + Netlify + Retell + ElevenLabs + Twilio. Currently in Phase 2 of 5 (Outbound Call Engine — code complete, live QA pending).

## Quick Facts

- **Core value:** The AI makes the call the second you hit Send — in your own voice, without ever stuttering.
- **Target user:** Adults who stutter (PWS), 22–45, English-speaking markets
- **Pricing:** Free (1/mo) · Premium $19 (10/mo) · Pro $49 (unlimited)
- **Billing:** PayPal (not Stripe)
- **Stack:** React 19 + TypeScript + Vite + Supabase + Netlify Functions + Retell + ElevenLabs + Twilio + Anthropic
- **Supabase project:** voermsyzakngbllmqlvc (us-east-1)
- **Build state:** Phase 1 done ✅ · Phase 2 code done, QA pending 🔶 · Phase 3–5 not started ⬜
- **Highest risk phase:** Phase 4 (Retell SIP-into-Twilio-Conference — spike required before planning)
- **Not:** a therapy tool, a transcription service, a voice assistant, an enterprise product, or Boltcall

## What Boltcall vs Fluent Is

| | Boltcall | Fluent |
|--|---------|--------|
| **Who** | Local service businesses (B2B) | People who stutter (B2C) |
| **What** | Speed-to-lead: AI answers inbound leads | Personal proxy: AI makes outbound calls |
| **Call direction** | Inbound | Outbound |
| **Voice** | Business AI voice | User's own cloned voice |
| **Stack** | Same (React + Netlify + Supabase + Retell) | Same (reused patterns) |
| **Billing** | Business pricing | Personal pricing ($19–$49/mo) |

---
*Created: 2026-05-05*
