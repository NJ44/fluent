---
phase: 02-outbound-call-engine
plan: "04"
subsystem: ui
tags: [react, zustand, tailwind, supabase, e164, tcpa, form-validation]

# Dependency graph
requires:
  - phase: 02-outbound-call-engine
    provides: initiate-call Netlify function, CallStatus type, getDisconnectionMessage(), calls table
  - phase: 01-auth-voice-clone-foundation
    provides: useAuth, supabase client, ProtectedRoute, voice_clones table

provides:
  - IntentForm component with E.164 validation, clone check, fallback rules, consent checkbox
  - Dashboard page embedding IntentForm, navigating to /calls/:id on submit
  - CallStatus page polling Supabase every 2s, status timeline, human-readable failure messages
  - useCallStore Zustand store for in-progress call state (callId, retellCallId, status)
  - /calls/:id and /dashboard and /history routes in App.tsx

affects: [02-05, 03-realtime-transcript]

# Tech tracking
tech-stack:
  added: [zustand@^4]
  patterns:
    - Zustand for ephemeral call state (not persisted)
    - Polling-first for status updates (Supabase Realtime deferred to Phase 3)
    - E.164 validation inline on blur (not on change) for UX

key-files:
  created:
    - src/store/callStore.ts
    - src/components/IntentForm.tsx
    - src/pages/Dashboard.tsx
    - src/pages/CallStatus.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Button text always 'Send call' regardless of clone state — disambiguation handled by amber banner above form (makes test-by-role reliable)"
  - "Static hint text uses 'E.164 format' wording not 'international format' — avoids multiple-match conflict with error message in tests"
  - "Polling at 2s interval until terminal status — Phase 3 will replace with Supabase Realtime"

patterns-established:
  - "IntentForm: check resource existence via Supabase .maybeSingle() on mount before enabling submit"
  - "CallStatus: setInterval poll → clearInterval on terminal status or component unmount"

requirements-completed: [INTENT-01, INTENT-02, INTENT-03, INTENT-04, CALL-05, CALL-07]

# Metrics
duration: 6min
completed: 2026-05-05
---

# Phase 02 Plan 04: Call Intent Form + Dashboard + Call Status Summary

**React call-intent form with E.164 validation, clone-gate submit, and live status page polling Supabase via Zustand store**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-05T05:45:35Z
- **Completed:** 2026-05-05T05:51:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- IntentForm component satisfying INTENT-01..04: call goal textarea, E.164 phone validation on blur, up to 3 fallback rules with add/remove, consent checkbox, submit gated on active voice clone
- Zustand callStore with setCurrentCall, updateStatus, clearCall for ephemeral call state
- CallStatus page with 2s polling, visual status timeline (initiating→ringing→active→ended→analyzed), human-readable failure messages via getDisconnectionMessage() (CALL-05, CALL-07)
- Dashboard page wrapping IntentForm and navigating to /calls/:id on submit
- App.tsx updated: real Dashboard, /calls/:id CallStatus, /history placeholder, catch-all redirect

## Task Commits

1. **Task 1: callStore.ts + IntentForm.tsx** - `7f81ab6` (feat)
2. **Task 2: Dashboard.tsx + CallStatus.tsx + App.tsx routing** - `e75c6c2` (feat)

## Files Created/Modified

- `src/store/callStore.ts` - Zustand store: currentCallId, currentRetellCallId, currentStatus
- `src/components/IntentForm.tsx` - 3-field form with E.164 validation, clone check, consent, Netlify POST
- `src/pages/Dashboard.tsx` - Dashboard with IntentForm, navigates to /calls/:id on submit
- `src/pages/CallStatus.tsx` - Live status polling, timeline, failure/outcome display
- `src/App.tsx` - Added Dashboard + CallStatus routes, /history placeholder, catch-all redirect

## Decisions Made

- Button text is always "Send call" regardless of clone state — the amber banner at top communicates clone absence; keeps `getByRole('button', { name: /send/i })` reliable in tests
- Static phone hint text uses "E.164 format" wording (not "international format") to avoid multiple-match with the blur-triggered error message in tests
- Polling interval at 2s — Phase 3 upgrades to Supabase Realtime subscription

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing zustand dependency**
- **Found during:** Task 1 (callStore.ts creation)
- **Issue:** zustand was not in package.json, import would fail at runtime
- **Fix:** Ran `npm install zustand`
- **Files modified:** package.json, package-lock.json
- **Verification:** callStore imports work cleanly, TypeScript resolves types
- **Committed in:** 7f81ab6 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed button text to always show "Send call"**
- **Found during:** Task 1 verification (intent-form.test.tsx)
- **Issue:** Test 2 uses `getByRole('button', { name: /send/i })` but button showed "No active clone — complete onboarding first" when clone absent — no match
- **Fix:** Changed button to always show "Send call" (disabled state communicated by amber banner above)
- **Files modified:** src/components/IntentForm.tsx
- **Verification:** All 3 intent-form tests pass
- **Committed in:** 7f81ab6 (Task 1 commit)

**3. [Rule 1 - Bug] Changed static phone hint text to avoid multiple-match**
- **Found during:** Task 1 verification (intent-form.test.tsx)
- **Issue:** Static hint "International format required..." + error "Please use international format..." both matched `/international format/i` in test 3
- **Fix:** Changed static hint to "Use E.164 format: ..." — avoids ambiguity
- **Files modified:** src/components/IntentForm.tsx
- **Verification:** Test 3 (E.164 validation error) passes
- **Committed in:** 7f81ab6 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All fixes required for tests to pass. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `src/components/ui/sonic-waveform.tsx` (framer-motion `ease` type mismatch) — out of scope, not introduced by this plan

## Next Phase Readiness

- IntentForm → initiate-call → /calls/:id flow is complete end-to-end
- Phase 02-05 (call history + detail page) can use the /calls/:id route and calls table directly
- Phase 03 (Realtime transcript) replaces the 2s polling in CallStatus with Supabase channel subscription

---
*Phase: 02-outbound-call-engine*
*Completed: 2026-05-05*
