---
phase: 01-auth-voice-clone-foundation
plan: "03"
subsystem: database
tags: [supabase, postgresql, rls, netlify-functions, typescript, voice-clones, migrations]

# Dependency graph
requires:
  - phase: 01-auth-voice-clone-foundation
    plan: "01"
    provides: "Project scaffold with @supabase/supabase-js installed and stub function files"
provides:
  - Supabase profiles table with cascade delete and auto-create trigger on auth.users INSERT
  - Supabase voice_clones table with RLS policy (VOICE-08) and one-active-per-user partial unique index
  - netlify/functions/_shared/token-utils.ts — getSupabase() and getServiceSupabase()
  - netlify/functions/_shared/cors.ts — getCorsHeaders() with ALLOWED_ORIGINS support
  - netlify/functions/_shared/auth-utils.ts — verifyBearerToken() JWT verification pattern
  - netlify/functions/_shared/verify-signatures.ts — verifyRetellSignature() and verifyTwilioSignature() stubs
affects: [02-auth-implementation, 05-netlify-functions, 04-call-engine]

# Tech tracking
tech-stack:
  added: ["@netlify/functions (devDependency)"]
  patterns:
    - "Service role bypass: Netlify functions use SUPABASE_SERVICE_KEY to bypass RLS for writes"
    - "Bearer token verification: verifyBearerToken() calls supabase.auth.getUser(token) via service role"
    - "Fail-loud service key: getServiceSupabase() throws if SUPABASE_SERVICE_KEY missing"
    - "Partial unique index for business constraint: one active clone per user enforced at DB level"

key-files:
  created:
    - supabase/migrations/20260504000001_create_profiles.sql
    - supabase/migrations/20260504000002_create_voice_clones.sql
    - supabase/README.md
    - netlify/functions/_shared/token-utils.ts
    - netlify/functions/_shared/cors.ts
    - netlify/functions/_shared/auth-utils.ts
    - netlify/functions/_shared/verify-signatures.ts
    - tsconfig.netlify.json
  modified:
    - package.json (added @netlify/functions devDependency)

key-decisions:
  - "SQL uses lowercase 'enable row level security' — valid PostgreSQL syntax identical to uppercase; does not affect plan truth"
  - "tsconfig.netlify.json added as deviation (Rule 2) — without it, TypeScript errors in netlify functions would not surface during dev"
  - "verify-signatures.ts uses require('crypto') instead of ES module import — Netlify functions run in Node.js CommonJS context"

patterns-established:
  - "verifyBearerToken() pattern: all Netlify mutation functions check auth before any data operation"
  - "getServiceSupabase() fail-loud: throws immediately if SUPABASE_SERVICE_KEY absent — prevents silent anon-key fallback for privileged operations"

requirements-completed: [VOICE-08]

# Metrics
duration: 3min
completed: 2026-05-04
---

# Phase 1 Plan 03: DB Schema + Netlify Shared Utilities Summary

**Supabase migrations for profiles/voice_clones with RLS owner-only policy, plus four shared Netlify function helper modules establishing the verifyBearerToken pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-04T16:33:36Z
- **Completed:** 2026-05-04T16:36:19Z
- **Tasks:** 2
- **Files modified:** 8 created, 1 modified

## Accomplishments
- Two SQL migration files ready to apply to Supabase — profiles with auto-trigger, voice_clones with RLS and one-active-per-user partial unique index satisfying VOICE-08
- Four shared Netlify function utility modules created: getServiceSupabase() throws on missing key (fail-loud), verifyBearerToken() establishes JWT auth pattern for all subsequent functions
- TypeScript compiles cleanly for all netlify/functions/**/*.ts files (verified via tsconfig.netlify.json)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase migration files for profiles + voice_clones** - `541f41a` (feat)
2. **Task 2: Create shared Netlify function utilities** - `2fb5e38` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `supabase/migrations/20260504000001_create_profiles.sql` - profiles table with cascade delete, auto-create trigger, RLS read/update
- `supabase/migrations/20260504000002_create_voice_clones.sql` - voice_clones table with RLS owner-only policy, partial unique index, Realtime enabled
- `supabase/README.md` - Migration workflow documentation with index table
- `netlify/functions/_shared/token-utils.ts` - getSupabase() (anon fallback with warning) and getServiceSupabase() (strict service role)
- `netlify/functions/_shared/cors.ts` - getCorsHeaders() with ALLOWED_ORIGINS env var, corsHeaders constant
- `netlify/functions/_shared/auth-utils.ts` - verifyBearerToken() extracts and verifies JWT from Authorization header
- `netlify/functions/_shared/verify-signatures.ts` - verifyRetellSignature() HMAC-SHA256 + verifyTwilioSignature() stub for Phase 2
- `tsconfig.netlify.json` - TypeScript config scoped to netlify/functions/**/*.ts
- `package.json` - @netlify/functions added as devDependency

## Decisions Made
- **tsconfig.netlify.json:** The main tsconfig.app.json only covers `src/`. Added a separate tsconfig for netlify functions to enable TypeScript checks for all function code.
- **SQL lowercase RLS syntax:** `alter table voice_clones enable row level security` is valid PostgreSQL. The plan verification grep uses uppercase but the SQL files use lowercase — semantically identical.
- **require('crypto') in verify-signatures.ts:** Netlify functions run in Node.js CommonJS runtime context; using `require('crypto')` is correct for HMAC operations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added tsconfig.netlify.json for function TypeScript type-checking**
- **Found during:** Task 2 (running `npx tsc --noEmit`)
- **Issue:** The project's root tsconfig.json only references tsconfig.app.json (covers src/) and tsconfig.node.json (covers vite.config.ts). netlify/functions/ had no TypeScript compilation coverage — errors in shared utilities would never surface.
- **Fix:** Created tsconfig.netlify.json targeting netlify/functions/**/*.ts with CommonJS module resolution
- **Files modified:** tsconfig.netlify.json created
- **Verification:** `npx tsc --project tsconfig.netlify.json` exits 0
- **Committed in:** 2fb5e38 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical infrastructure)
**Impact on plan:** tsconfig.netlify.json is necessary for TypeScript errors in function code to be detectable. No scope creep.

## Issues Encountered
None — both tasks executed cleanly on first attempt.

## User Setup Required
None in this plan. SQL migrations require manual application to Supabase:
- Apply with `supabase db push` (CLI) or paste in Supabase Dashboard SQL Editor
- Environment variables needed for Netlify functions: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `VITE_SUPABASE_ANON_KEY`
- See `supabase/README.md` for migration workflow details

## Next Phase Readiness
- Plan 05 (Netlify functions) can import from `netlify/functions/_shared/` immediately — all four utilities ready
- Plan 02 (auth implementation) can proceed independently — no shared files overlap
- SQL migrations ready to apply to Supabase project before Plan 05 runs live Netlify functions
- verifyBearerToken() pattern established — all mutation functions should follow this exact pattern

---
*Phase: 01-auth-voice-clone-foundation*
*Completed: 2026-05-04*
