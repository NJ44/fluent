---
phase: 02-outbound-call-engine
plan: "05"
subsystem: ui
tags: [react, supabase, typescript, react-router, call-history, call-detail]

# Dependency graph
requires:
  - phase: 02-outbound-call-engine/02-01
    provides: Call type, CallStatus type, getDisconnectionMessage() from src/types/calls.ts
  - phase: 02-outbound-call-engine/02-03
    provides: calls table with outcome_summary and transcript columns populated by webhook + Claude
  - phase: 02-outbound-call-engine/02-04
    provides: App.tsx routing skeleton with /calls/:id placeholder using CallStatus
provides:
  - CallDetail page at src/pages/CallDetail.tsx — unified call view (in-progress polling + outcome summary + transcript)
  - CallHistory page at src/pages/CallHistory.tsx — paginated list of all past calls
  - App.tsx final routing — /calls/:id → CallDetail, /history → CallHistory
affects: [03-real-time-experience, phase-3-realtime-upgrade]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified route pattern: /calls/:id serves both in-progress (polling) and terminal (transcript+summary) states"
    - "data-call-id attribute on list rows for test targeting without brittle text selectors"
    - "Explicit user_id in Supabase query hits calls_user_created_idx index before .order()"

key-files:
  created:
    - src/pages/CallDetail.tsx
    - src/pages/CallHistory.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "CallDetail replaces CallStatus as the unified /calls/:id route — handles in-progress (shows polling + status timeline) and terminal states (shows outcome summary + transcript) in one component, avoiding jarring page transition mid-call"
  - "CallHistory uses .eq('user_id', user.id) before .order() to hit calls_user_created_idx composite index for index-scan performance"

patterns-established:
  - "data-call-id attribute on clickable list rows: enables fireEvent.click(row.closest('[data-call-id]')) test pattern without brittle text-based selectors"
  - "TranscriptView: splits transcript on newlines, detects AI: / Agent: prefix for chat-bubble layout"

requirements-completed: [POST-01, POST-02, HIST-01, HIST-02]

# Metrics
duration: 8min
completed: 2026-05-05
---

# Phase 02 Plan 05: Call Detail + Call History Pages Summary

**React read-side of call engine: CallDetail (in-progress polling + transcript/summary) and CallHistory (paginated list with intent, outcome, failure reason) wired to Supabase**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-05T05:58:00Z
- **Completed:** 2026-05-05T06:05:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CallDetail.tsx fetches call by ID, polls every 2s for in-progress calls, stops polling on terminal status, renders outcome_summary (POST-01) and full transcript as chat bubbles (POST-02), shows getDisconnectionMessage() for failed calls (CALL-07)
- CallHistory.tsx queries calls ordered by created_at DESC (HIST-01), renders one row per call with data-call-id attribute, navigates to /calls/:id on click (HIST-02)
- App.tsx updated to replace CallStatus with CallDetail on /calls/:id (unified route) and add CallHistory on /history

## Task Commits

Each task was committed atomically:

1. **Task 1: CallDetail.tsx — outcome summary + full transcript view** - `d0642be` (feat)
2. **Task 2: CallHistory.tsx + App.tsx final routing** - `1ca175a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/CallDetail.tsx` - Unified call view: metadata + status timeline (in-progress) + failure reason + outcome summary + transcript chat bubbles
- `src/pages/CallHistory.tsx` - Browseable history list with status badges, intent, outcome/failure summary, relative dates
- `src/App.tsx` - Replaced CallStatus import with CallDetail + added CallHistory; /calls/:id and /history routes finalized

## Decisions Made
- CallDetail replaces CallStatus as the unified /calls/:id route — no jarring mid-call redirect; handles all states in one component with 2s polling until terminal
- Explicit `.eq('user_id', user.id)` before `.order()` in CallHistory query to hit the `calls_user_created_idx` composite index

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused STATUS_COLORS declaration causing TS6133**
- **Found during:** Task 1 (CallDetail build verification)
- **Issue:** STATUS_COLORS was declared but never used — TypeScript strict mode emits TS6133
- **Fix:** Removed the unused constant (STATUS_LABELS is used for the status badge text)
- **Files modified:** src/pages/CallDetail.tsx
- **Verification:** npm run build produces 0 errors in our new files (7 pre-existing errors in sonic-waveform.tsx, HomePage.tsx, useLenis remain unchanged)
- **Committed in:** 1ca175a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: unused variable causing TS error)
**Impact on plan:** Minimal — removed one unused constant. No scope creep.

## Issues Encountered
- Pre-existing build errors in `src/components/ui/sonic-waveform.tsx`, `src/pages/HomePage.tsx`, and `src/hooks/useLenis.ts` (framer-motion Variants typing, missing module). These 7 errors existed before this plan and are out of scope. Logged to deferred-items.

## Next Phase Readiness
- Read-side of call engine is complete — users can browse call history and view transcripts + summaries
- Phase 3 (Realtime) can upgrade the 2s polling in CallDetail to Supabase Realtime subscription
- All 6 HIST/POST requirement tests green: POST-01, POST-02, HIST-01, HIST-02
- Full suite: 57 passed, 1 skipped (pre-existing RLS integration test)

---
*Phase: 02-outbound-call-engine*
*Completed: 2026-05-05*
