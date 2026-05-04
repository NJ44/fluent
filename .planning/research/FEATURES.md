# Feature Landscape — Fluent

**Domain:** Consumer AI phone-call proxy with voice cloning for people who stutter
**Researched:** 2026-05-04
**Confidence:** MEDIUM-HIGH

---

## Executive Framing

Fluent sits at a unique intersection:
1. **AI phone agent** (Bland/Retell/Synthflow lineage) — but consumer-facing, single-call, single-user
2. **Voice clone product** (ElevenLabs lineage) — but the clone is the user's own voice
3. **Accessibility utility** (Apple Personal Voice + Live Speech) — but autonomous, not real-time typing

No competitor combines all three. **AI Haggler** is closest ("AI makes calls for you") but uses a generic voice and is not accessibility-focused. **Apple Personal Voice + Live Speech** lets users type during a live call in their cloned voice — but they're still on the call.

This gap is Fluent's wedge.

---

## Table Stakes

Features required for users to trust the product. Missing any = product feels broken or unsafe.

| Feature | Why Expected | Complexity | Confidence |
|---------|--------------|------------|------------|
| Email/password sign-up + auth | Baseline SaaS | Low | HIGH |
| Voice clone onboarding with guided recording | The entire product depends on it | Low-Med | HIGH |
| Sample playback before committing clone | User must hear clone before trusting it | Low | HIGH |
| Type call intent in plain English | Core input surface | Low | HIGH |
| Outbound call with <1.5s response latency | Latency floor set by Bland/Retell. Above 1.5s callers think line dropped | Med | HIGH |
| Real-time live transcript | Safety net for barge-in. Without it, product is a black box | Med | HIGH |
| One-button barge-in (large, always visible, no confirmation dialog) | The emotional safety net. Must be <300ms perceived response | Med-High | HIGH |
| Clean call end when goal is met or fails | AI must know when to stop | Med | HIGH |
| Post-call outcome: success / partial / failed | 1-sentence Claude summary | Low | HIGH |
| Cancel/kill-switch button | Distinct from barge-in. "End call NOW." | Low | HIGH |
| Call history list (intent → outcome → transcript) | "The vault" already in spec | Low | HIGH |
| Usage quota display ("X calls remaining") | Free tier anxiety is real | Low | HIGH |
| AI identifies itself as AI at call start | **Non-negotiable.** FCC Feb 2024 + CA AB 2905. | Low | HIGH |
| Voice clone is private, not shared, deletable | Trust foundation | Low | HIGH |
| Mobile-responsive web UI | Calls happen on the move | Med | HIGH |

---

## Differentiators

What makes a stutterer pick Fluent over asking a friend, using AI Haggler, or toughing it out.

| Feature | Value | Complexity | Confidence |
|---------|-------|------------|------------|
| **Cloned voice** | "It's YOUR voice on the phone." No B2B AI agent has this for accessibility. Emotionally enormous. | In spec | HIGH |
| **What-if fallback rules** (in spec) | "If 7pm is full, try 8pm." Explicit, editable branches. AI Haggler does this implicitly — making it visible is the win. | Med | HIGH |
| **Watch + intervene paradigm** | No AI phone agent has consumer co-pilot mode. Google Duplex has operator takeover, not user takeover. | High | HIGH |
| **Dignity-first copy** | Never "for people who can't speak." Always "make the call without the call making you." Copy is a product feature. | Low | MEDIUM |
| **One-tap calendar sync** (in spec) | Closes the loop. If users re-enter appointments manually, the magic dies. | Low | HIGH |
| **Pre-call "rehearsal" mode** | Hear the AI say your opening line before dialing. Mirrors prep phase from Stuttering Foundation research. | Low | MEDIUM |
| **"What if they ask…" intent expander** | Claude surfaces likely questions before the call — user pre-answers once, becomes silent rules. | Med | MEDIUM |
| **Outcome card with "Edit and retry"** | If call partially failed, one tap re-runs with missing info filled in. | Low | MEDIUM |

---

## Anti-Features (deliberately NOT in v1)

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Inbound call handling | Already out of scope. Different product. |
| Real-time AI conversation (caller talks TO AI) | Doubles regulatory complexity. Out of scope. |
| Therapy / fluency training features | Muddies positioning AND enters medical-adjacent regulatory space. |
| Multi-language v1 | Multiplies prompt complexity, disclosure language, testing surface. |
| Mobile native app | Web-first is correct. WebRTC works in browser. |
| Team / shared accounts | Solo user product. RBAC + billing complexity not needed. |
| Call sentiment / AI rating of call quality | Stutterers are hyper-sensitive to being graded. Factual outcome only. |
| Public voice marketplace | Any sharing UI invites misuse and destroys privacy promise. |
| Auto-retry on busy (AI calls 3 times automatically) | User wakes up to "your AI called my office 3 times." One try, then prompt user. |
| In-app analytics ("you saved 14 calls this month!") | Quantifying avoided distress is creepy and clinical. |
| Voice personality sliders ("make my voice more confident") | Implies "you, but better." Wrong message. |
| AI synthetic filler words ("um", "uh") | For a stutter product, fake disfluencies are deeply ironic. |

---

## Feature Dependencies

```
Voice clone onboarding
    └─> All calls (clone required)

Intent + fallback rules input
    └─> Outbound call (structured prompt)

Outbound call
    ├─> Live transcript (Supabase Realtime)
    ├─> Barge-in (Conference mute toggle)
    └─> Call recording (optional)

Call ends
    └─> Outcome summary (Claude)
        └─> Calendar sync
        └─> Vault entry (history)

Plan tier → Usage gate → Outbound call (hard block at limit)
```

---

## MVP Scope Recommendation

Current PROJECT.md scope is correct — do not expand. Prioritize this order:

1. Voice clone onboarding with sample playback (first impression = trust)
2. Intent + fallback rules input UI (the differentiator over AI Haggler)
3. Outbound call → live transcript → barge-in loop (core watch+intervene)
4. Outcome summary + calendar sync (closes the loop)
5. Quota gating + plan tiers (commercial viability from day 1)

**Defer to v1.1:** Pre-call rehearsal, intent expander, outcome retry button
**Defer indefinitely:** Everything in the Anti-Features table

---

## Key Pitfall for Features

**Voice clone of a stutterer cloning the stutter.** ElevenLabs clones everything including blocking patterns. A user who stutters during the 30s sample gets a clone that also stutters. Onboarding MUST guide them to record their most fluent baseline (scripted text, slow pacing), and copy must frame this: "Record what's comfortable. We'll handle the fluency."

---

## Sources
- [ElevenLabs IVC docs](https://elevenlabs.io/docs/creative-platform/voices/voice-cloning/instant-voice-cloning)
- [FCC ruling on AI voices](https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices)
- [Stuttering Foundation: Using the Telephone](https://www.stutteringhelp.org/using-telephone)
- [Apple Personal Voice + Live Speech](https://www.apple.com/accessibility/features/)
- [AI Haggler](https://aihaggler.com/)
- [Google Duplex blog](https://research.google/blog/google-duplex-an-ai-system-for-accomplishing-real-world-tasks-over-the-phone/)
- [Cresta: voice agent latency engineering](https://cresta.com/blog/engineering-for-real-time-voice-agent-latency)
