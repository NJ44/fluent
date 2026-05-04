---
phase: 01-auth-voice-clone-foundation
plan: "01"
subsystem: testing
tags: [vitest, jsdom, react-testing-library, vite, tailwindcss, supabase, react-router-dom]

# Dependency graph
requires: []
provides:
  - Vitest + jsdom test runner configured and running
  - Wave 0 test stubs for AUTH-01/02/03/04 and VOICE-03/06/07
  - Vite + React 19 + TypeScript + Tailwind v4 project scaffold
  - netlify.toml with /api/* redirect and function config
  - .env.example documenting all 6 required env vars
  - Stub source files for all deferred modules (fail informatively until implemented)
affects: [02-auth-implementation, 03-voice-clone-ui, 05-netlify-functions]

# Tech tracking
tech-stack:
  added: [vitest@3, @testing-library/react@16, @testing-library/jest-dom@6, jsdom@26, @supabase/supabase-js@2, react-router-dom@7, tailwindcss@4, @tailwindcss/vite@4]
  patterns: [Wave-0 test stubs with stub source files for Vite import resolution, TDD red-to-green arc via stub modules]

key-files:
  created:
    - vitest.config.ts
    - tests/setup.ts
    - tests/auth.test.ts
    - tests/supabase-client.test.ts
    - tests/ProtectedRoute.test.tsx
    - tests/audio-quality.test.ts
    - tests/clone-voice-fn.test.ts
    - tests/rls.test.ts
    - src/lib/auth.ts (stub)
    - src/lib/supabase.ts (stub)
    - src/lib/audio-quality.ts (stub)
    - src/contexts/AuthContext.ts (stub)
    - src/components/ProtectedRoute.tsx (stub)
    - netlify/functions/clone-voice.ts (stub)
    - netlify/functions/delete-voice.ts (stub)
  modified: []

key-decisions:
  - "Stub source files required for Vite import resolution: Vite resolves all dynamic import() calls at transform time (not runtime), so wave 0 test stubs need real files at each import path; stubs throw informative errors until real implementation ships"
  - "Tailwind v4 Vite plugin used (@tailwindcss/vite) instead of PostCSS — no tailwind.config.js needed"
  - "evaluateQuality() tested as pure function separate from analyzeAudioQuality() (which needs Web Audio API) — enables unit testing without jsdom limitations"

patterns-established:
  - "Stub pattern: create minimal export that throws 'not yet implemented — will be created in Plan XX' to give clear red test failures"
  - "Test structure: vi.mock + dynamic import allows module-level mock isolation per test file"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, VOICE-03, VOICE-06, VOICE-07]

# Metrics
duration: 3min
completed: 2026-05-04
---

# Phase 1 Plan 01: Bootstrap + Wave 0 Test Stubs Summary

**Vite + React 19 + Tailwind v4 scaffold with Vitest/jsdom and 6 Wave 0 test stub files covering AUTH-01/02/03/04 and VOICE-03/06/07**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-04T16:24:49Z
- **Completed:** 2026-05-04T16:27:43Z
- **Tasks:** 2
- **Files modified:** 15 created

## Accomplishments
- Vite + React 19 + TypeScript + Tailwind v4 project confirmed building (`npm run build` exits 0, dist/ produced)
- Vitest with jsdom environment configured; `npx vitest run` loads all 6 test files without import crashes
- All Wave 0 test stubs define real behavior expectations (red tests, not no-ops) ready to go green in Plans 02/03/05
- Stub source files at each import path ensure Vite transform succeeds while still failing tests informatively
- `rls.test.ts` skipped placeholder and `clone-voice-fn.test.ts` failing stub committed as intentional red state

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Vite project + install all dependencies** - `e51b95a` (chore - previous commit, scaffold already complete)
2. **Task 2: Create vitest.config.ts + all Wave 0 test stubs** - `abb5f99` (test)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `vitest.config.ts` - Vitest config with jsdom environment, globals, setupFiles, and tests/ include glob
- `tests/setup.ts` - @testing-library/jest-dom import
- `tests/auth.test.ts` - AUTH-01 signup, login, AUTH-03 logout behavior stubs
- `tests/supabase-client.test.ts` - supabase client persistSession + autoRefreshToken config stubs
- `tests/ProtectedRoute.test.tsx` - AUTH-04 redirect and children render stubs
- `tests/audio-quality.test.ts` - VOICE-03 quality gate stubs (rms, silence, duration, warning)
- `tests/clone-voice-fn.test.ts` - VOICE-06/07 clone/delete handler import stubs (red state)
- `tests/rls.test.ts` - Skipped RLS integration test placeholder
- `src/lib/auth.ts` - Stub: throws "not yet implemented" until Plan 02
- `src/lib/supabase.ts` - Stub: throws at module load until Plan 02
- `src/lib/audio-quality.ts` - Stub: throws "not yet implemented" until Plan 03
- `src/contexts/AuthContext.ts` - Stub: throws "not yet implemented" until Plan 02
- `src/components/ProtectedRoute.tsx` - Stub: throws "not yet implemented" until Plan 02
- `netlify/functions/clone-voice.ts` - Stub: exports handler=undefined until Plan 05
- `netlify/functions/delete-voice.ts` - Stub: exports handler=undefined until Plan 05

## Decisions Made
- **Stub source files for Vite import resolution:** Vite's bundler resolves all `import()` calls at transform time, not runtime. Wave 0 test stubs with bare dynamic imports crash the test runner before any test runs. Solution: create stub source files at each path that export/throw immediately — Vite can transform the file, and tests fail informatively at call time with clear "not yet implemented" messages.
- **Tailwind v4 via @tailwindcss/vite:** Used Vite plugin approach, no tailwind.config.js required. This is the recommended pattern for v4.
- **evaluateQuality as pure function:** Plan specifies testing audio quality logic as `evaluateQuality(metrics)` (pure) separate from `analyzeAudioQuality(blob)` (async/Web Audio). This makes the quality gate logic unit-testable without jsdom Web Audio API limitations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added stub source files to fix Vite transform-time import resolution**
- **Found during:** Task 2 (running `npx vitest run` after creating test stubs)
- **Issue:** Vitest/Vite resolves all `import()` calls at transform time (not test execution time). All 5 test files crashed with "Failed to resolve import" errors before any test ran, making the test runner unusable.
- **Fix:** Created minimal stub files at every import path referenced in tests (`src/lib/auth.ts`, `src/lib/supabase.ts`, `src/lib/audio-quality.ts`, `src/contexts/AuthContext.ts`, `src/components/ProtectedRoute.tsx`, `netlify/functions/clone-voice.ts`, `netlify/functions/delete-voice.ts`). Each stub either throws an informative error or exports a sentinel value so tests fail with clear messages.
- **Files modified:** 7 stub files created
- **Verification:** `npx vitest run` loads all 6 test files; 14 tests fail informatively; 1 test skipped
- **Committed in:** abb5f99 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Required fix for the test runner to function at all. Stub files are Wave 0 artifacts that future plans replace with real implementations. No scope creep.

## Issues Encountered
None beyond the auto-fixed Vite import resolution issue above.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- Test infrastructure is fully operational — Plans 02, 03, 05 can run `npx vitest run` to track red-to-green progress
- Plan 02 (auth implementation) will replace: `src/lib/auth.ts`, `src/lib/supabase.ts`, `src/contexts/AuthContext.ts`, `src/components/ProtectedRoute.tsx`
- Plan 03 (voice clone UI) will replace: `src/lib/audio-quality.ts`
- Plan 05 (Netlify functions) will replace: `netlify/functions/clone-voice.ts`, `netlify/functions/delete-voice.ts`
- Build passes, Tailwind configured, routing library installed — UI work can begin immediately

---
*Phase: 01-auth-voice-clone-foundation*
*Completed: 2026-05-04*
