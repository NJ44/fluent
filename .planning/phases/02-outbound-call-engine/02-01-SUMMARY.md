---
plan: 02-01
phase: 02-outbound-call-engine
status: complete
completed: 2026-05-05
tasks_complete: 2/2
---

# Plan 02-01 Summary: Wave 0 Foundation

## What Was Built

**Task 1: DB migrations + types + signature fix**
- `supabase/migrations/20260504000004_create_calls.sql` — `calls` table with full lifecycle state machine (`draft → initiating → ringing → active → ended → analyzed`), RLS, composite index on `(user_id, created_at DESC)`
- `supabase/migrations/20260504000005_add_retell_agent_to_voice_clones.sql` — adds `retell_agent_id` and `retell_llm_id` to `voice_clones` table
- `src/types/calls.ts` — `Call`, `CallStatus` types, `FAILURE_DISCONNECTION_REASONS` set, `isFailureDisconnection()`, `getDisconnectionMessage()` utilities
- `netlify/functions/_shared/verify-signatures.ts` — fixed to use `RETELL_API_KEY` (not a separate secret), signs `rawBody + timestampStr`, parses `v={ts},d={hex}` header format, 5-minute replay window, timing-safe compare
- `.env.example` — added `ANTHROPIC_API_KEY` and `RETELL_FROM_NUMBER`

**Task 2: Wave 0 test stubs (intentionally red-to-green)**
- `tests/verify-signatures.test.ts` — 5 tests, GREEN immediately (fixed implementation)
- `tests/calls.test.ts` — 9 tests, GREEN (utilities tested against real implementation)
- `tests/intent-form.test.tsx` — 3 stubs RED (awaiting plan 02-04 IntentForm)
- `tests/initiate-call-fn.test.ts` — 5 stubs RED (awaiting plan 02-02 initiate-call)
- `tests/agent-setup.test.ts` — 3 stubs RED (awaiting plan 02-02 setup-retell-agent)
- `tests/retell-webhook-fn.test.ts` — 6 stubs RED (awaiting plan 02-03 retell-webhook)
- `tests/call-detail.test.tsx` — 2 stubs RED (awaiting plan 02-05 CallDetail)
- `tests/call-history.test.tsx` — 4 stubs RED (awaiting plan 02-05 CallHistory)

## Key Files

### Created
- `supabase/migrations/20260504000004_create_calls.sql`
- `supabase/migrations/20260504000005_add_retell_agent_to_voice_clones.sql`
- `src/types/calls.ts`
- `tests/verify-signatures.test.ts`
- `tests/calls.test.ts`
- `tests/initiate-call-fn.test.ts`
- `tests/agent-setup.test.ts`
- `tests/retell-webhook-fn.test.ts`
- `tests/intent-form.test.tsx`
- `tests/call-detail.test.tsx`
- `tests/call-history.test.tsx`

### Modified
- `netlify/functions/_shared/verify-signatures.ts` (signature fix)
- `.env.example` (new vars)

## Self-Check: PASSED

- verify-signatures.test.ts: 5/5 GREEN
- calls.test.ts: 9/9 GREEN
- All other stubs intentionally RED — correct for Wave 0

## Deviations

None.
