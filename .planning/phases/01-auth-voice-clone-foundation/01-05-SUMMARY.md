---
phase: 01-auth-voice-clone-foundation
plan: "05"
subsystem: api+ui
tags: [netlify-functions, retell-api, supabase-storage, busboy, vitest, tdd, react, tailwind, gdpr]

# Dependency graph
requires:
  - phase: 01-02
    provides: useAuth, verifyBearerToken pattern for Netlify functions
  - phase: 01-03
    provides: getServiceSupabase, getCorsHeaders, voice_clones DB schema
  - phase: 01-04
    provides: mainBlob + passphraseBlob from VoiceOnboarding wizard

provides:
  - clone-voice Netlify function: multipart parsing, Retell clone API, Storage upload, DB insert
  - delete-voice Netlify function: GDPR delete (Retell + Storage + DB soft-delete)
  - preview-voice Netlify function: GET endpoint returning preview_audio_url
  - CloneStep component: submits audio blobs, shows loading/error states
  - PlaybackStep component: plays preview audio, confirm/restart buttons
  - Settings page: clone status, re-clone modal, delete flow, account section
  - Migration 20260504000003: preview_audio_url column on voice_clones

affects:
  - 02-voice-call-core  # retell_voice_id from voice_clones used in call routing

# Tech tracking
tech-stack:
  added:
    - busboy (multipart form-data parsing in Netlify functions)
    - "@types/busboy (TypeScript types for busboy)"
  patterns:
    - Netlify multipart parsing via busboy with Buffer.from (base64 or utf-8)
    - Retell raw fetch (not SDK) for multipart/form-data clone API
    - Supabase Storage upload for consent evidence (voice-evidence bucket)
    - Soft-delete pattern: status='deleted' preserves audit trail
    - Supersede pattern: UPDATE status='superseded' BEFORE INSERT of new active clone
    - Vitest mock pattern: process.env vars must be set before module import to pass guard checks

key-files:
  created:
    - netlify/functions/clone-voice.ts
    - netlify/functions/delete-voice.ts
    - netlify/functions/preview-voice.ts
    - src/components/voice/CloneStep.tsx
    - src/components/voice/PlaybackStep.tsx
    - src/pages/Settings.tsx
    - supabase/migrations/20260504000003_add_preview_audio_url.sql
  modified:
    - src/pages/VoiceOnboarding.tsx
    - src/App.tsx
    - tests/clone-voice-fn.test.ts

key-decisions:
  - "Used busboy with require() pattern (not ESM import) due to tsconfig.netlify.json CommonJS target + no esModuleInterop"
  - "getServiceSupabase() throws on missing SUPABASE_SERVICE_KEY — test env vars must be set before import"
  - "delete-voice: logs but continues on Retell/Storage failure (partial GDPR > blocking user); only returns 500 if DB update fails"
  - "clone-voice.ts returns 502 on Retell failure (upstream error), not 500 (our error)"
  - "PlaybackStep handles null/empty previewAudioUrl gracefully with Continue anyway fallback"
  - "VoiceOnboarding accepts isReclone+onRecloneComplete props for Settings modal reuse"

# Metrics
duration: partial (checkpoint:human-verify pending)
completed: 2026-05-04
checkpoint_status: awaiting human verification
---

# Phase 01 Plan 05: Voice Clone Pipeline Summary

**Full voice clone pipeline: record → consent → clone API → preview playback → confirm. Settings re-clone + GDPR delete. All 20 Vitest tests green.**

## Status: CHECKPOINT — Awaiting Human Verification

Tasks 1 and 2 complete. Plan paused at Task 3 (checkpoint:human-verify).

## Performance

- **Duration:** ~25 min (Tasks 1-2)
- **Started:** 2026-05-04T20:54:00Z
- **Completed (partial):** 2026-05-04T21:02:00Z
- **Tasks completed:** 2 of 3

## Accomplishments

### Task 1: Netlify Functions (TDD Red → Green)

- Wrote failing tests first (7 tests): clone-voice supersede, OPTIONS preflight, 401, delete flow
- Installed `busboy` for multipart parsing in Netlify functions
- Implemented `clone-voice.ts` (130+ lines): busboy parsing, reclone supersede, Storage upload, Retell API call, DB insert
- Implemented `delete-voice.ts` (100+ lines): ownership check, Retell DELETE, Storage remove, DB soft-delete
- Implemented `preview-voice.ts` (55+ lines): GET returns preview_audio_url for active clone
- Created `supabase/migrations/20260504000003_add_preview_audio_url.sql`: additive column migration
- All 7 clone-voice-fn tests GREEN; full 20-test suite GREEN

### Task 2: UI Components + Settings

- `CloneStep.tsx` (120+ lines): submits blobs to /api/clone-voice on mount, shows loading/error/retry
- `PlaybackStep.tsx` (80+ lines): autoPlay audio, handles null preview_audio_url, confirm/restart buttons
- Updated `VoiceOnboarding.tsx`: wired real CloneStep + PlaybackStep, isReclone prop, navigate to /dashboard on done
- `Settings.tsx` (220+ lines): clone status badge, re-clone modal (full VoiceOnboarding), delete confirmation dialog, account section, sign-out
- Added `/settings` route to App.tsx under ProtectedRoute
- `npx tsc --noEmit` — no errors; `npm run build` — succeeds (96 modules, 472kB bundle)

## Task Commits

1. **test(01-05): add failing tests for clone-voice + delete-voice handlers** — `7b6c144`
2. **feat(01-05): clone-voice + delete-voice + preview-voice Netlify functions** — `6729c11`
3. **feat(01-05): CloneStep + PlaybackStep components + Settings page** — `e6861e5`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] process.env guard in getServiceSupabase() blocked tests**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `getServiceSupabase()` throws before calling mocked `createClient` if `SUPABASE_SERVICE_KEY` is not set — `mockUpdate` was never called (0 calls)
- **Fix:** Added `process.env.SUPABASE_URL = 'https://test.supabase.co'` etc. at top of test file before any imports
- **Files modified:** `tests/clone-voice-fn.test.ts`
- **Verification:** Supersede test passed after fix

**2. [Rule 1 - Bug] busboy ESM import caused TypeScript error with CommonJS tsconfig**
- **Found during:** Task 1 (after implementing clone-voice.ts)
- **Issue:** `import busboy from 'busboy'` → `TS2694: Module has no exported member 'default'` with `tsconfig.netlify.json` (`module: CommonJS`, no `esModuleInterop`)
- **Fix:** Changed to `const busboy = require('busboy') as (opts: BusboyConfig) => Busboy`
- **Files modified:** `netlify/functions/clone-voice.ts`

**3. [Rule 1 - Bug] Supabase `.select().eq().eq().eq()` mock chain only had 2 levels**
- **Found during:** Task 1 (delete-voice test)
- **Issue:** `delete-voice.ts` chains `.eq('id', ...).eq('user_id', ...).eq('status', 'active').limit(1)` — 3 eq levels; mock only had 2
- **Fix:** Added third `.eq()` level in `@supabase/supabase-js` mock
- **Files modified:** `tests/clone-voice-fn.test.ts`

**4. [Rule 2 - Auto] vi.clearAllMocks() cleared mock implementations, not just call history**
- **Found during:** Task 1 test refactoring
- **Issue:** Using `vi.clearAllMocks()` cleared `mockUpdate.mockReturnValue(...)` implementations, causing handler to get `undefined` from supabase chains
- **Fix:** Switched to `mockUpdate.mockClear()` (clears call history only) + re-apply `mockReturnValue` in `beforeEach`

## User Setup Required

Before running the full clone flow end-to-end:

1. **Retell API Key:** Set `RETELL_API_KEY` in `netlify.toml` or `.env` (Retell Dashboard → Settings → API Keys)
2. **Supabase Storage bucket:** Create `voice-evidence` bucket (private) in Supabase Dashboard → Storage
3. **Apply migrations:** Run all 3 migration files in Supabase Dashboard → SQL Editor:
   - `supabase/migrations/20260504000001_create_profiles.sql`
   - `supabase/migrations/20260504000002_create_voice_clones.sql`
   - `supabase/migrations/20260504000003_add_preview_audio_url.sql`
4. **Supabase service key:** `SUPABASE_SERVICE_KEY` env var for Netlify functions

## Self-Check

- [x] netlify/functions/clone-voice.ts exists (130+ lines)
- [x] netlify/functions/delete-voice.ts exists (100+ lines)
- [x] netlify/functions/preview-voice.ts exists (55+ lines)
- [x] src/components/voice/CloneStep.tsx exists
- [x] src/components/voice/PlaybackStep.tsx exists
- [x] src/pages/Settings.tsx exists
- [x] supabase/migrations/20260504000003_add_preview_audio_url.sql exists with ADD COLUMN IF NOT EXISTS
- [x] 20 tests pass, 1 skipped (rls.test.ts — requires live DB)
- [x] npx tsc --noEmit — no errors (both tsconfig.json and tsconfig.netlify.json)
- [x] npm run build — succeeds

## Self-Check: PASSED
