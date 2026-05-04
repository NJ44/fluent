---
phase: 2
slug: outbound-call-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (matches Vite stack) |
| **Config file** | `vitest.config.ts` — exists from Phase 1 |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/calls.test.ts tests/intent-form.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual outbound call test completed
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| INTENT-01 | TBD | TBD | INTENT-01 | unit (RTL) | `npx vitest run tests/intent-form.test.tsx -t "clone-blocked"` | ❌ W0 | ⬜ pending |
| INTENT-02 | TBD | TBD | INTENT-02 | unit (RTL) | `npx vitest run tests/intent-form.test.tsx -t "what-if"` | ❌ W0 | ⬜ pending |
| INTENT-03 | TBD | TBD | INTENT-03 | unit (mock) | `npx vitest run tests/initiate-call-fn.test.ts -t "system-prompt"` | ❌ W0 | ⬜ pending |
| INTENT-04 | TBD | TBD | INTENT-04 | unit (mock) | `npx vitest run tests/initiate-call-fn.test.ts -t "tcpa-begin"` | ❌ W0 | ⬜ pending |
| CALL-01 | TBD | TBD | CALL-01 | unit (mock) | `npx vitest run tests/initiate-call-fn.test.ts -t "lifecycle"` | ❌ W0 | ⬜ pending |
| CALL-02 | TBD | TBD | CALL-02 | unit (mock) | `npx vitest run tests/initiate-call-fn.test.ts -t "retell-agent"` | ❌ W0 | ⬜ pending |
| CALL-03 | TBD | TBD | CALL-03 | unit (mock) | `npx vitest run tests/retell-webhook-fn.test.ts -t "signature"` | ❌ W0 | ⬜ pending |
| CALL-05 | TBD | TBD | CALL-05 | unit | `npx vitest run tests/calls.test.ts -t "status-map"` | ❌ W0 | ⬜ pending |
| CALL-06 | TBD | TBD | CALL-06 | unit (mock) | `npx vitest run tests/retell-webhook-fn.test.ts -t "transcript-stored"` | ❌ W0 | ⬜ pending |
| CALL-07 | TBD | TBD | CALL-07 | unit (mock) | `npx vitest run tests/retell-webhook-fn.test.ts -t "summary"` | ❌ W0 | ⬜ pending |
| CALL-08 | TBD | TBD | CALL-08 | unit (mock) | `npx vitest run tests/retell-webhook-fn.test.ts -t "failure-states"` | ❌ W0 | ⬜ pending |
| POST-01 | TBD | TBD | POST-01 | unit (RTL) | `npx vitest run tests/call-detail.test.tsx` | ❌ W0 | ⬜ pending |
| POST-02 | TBD | TBD | POST-02 | unit (RTL) | `npx vitest run tests/call-detail.test.tsx -t "transcript"` | ❌ W0 | ⬜ pending |
| HIST-01 | TBD | TBD | HIST-01 | unit (RTL) | `npx vitest run tests/call-history.test.tsx` | ❌ W0 | ⬜ pending |
| HIST-02 | TBD | TBD | HIST-02 | unit (RTL) | `npx vitest run tests/call-history.test.tsx -t "open-entry"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/intent-form.test.tsx` — stubs for INTENT-01, INTENT-02
- [ ] `tests/initiate-call-fn.test.ts` — stubs for INTENT-03, INTENT-04, CALL-01, CALL-02
- [ ] `tests/retell-webhook-fn.test.ts` — stubs for CALL-03, CALL-06, CALL-07, CALL-08
- [ ] `tests/calls.test.ts` — stubs for CALL-05
- [ ] `tests/call-detail.test.tsx` — stubs for POST-01, POST-02
- [ ] `tests/call-history.test.tsx` — stubs for HIST-01, HIST-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Outbound call fires and rings a real number | CALL-01, CALL-02 | Requires live Retell + Twilio credentials and a real phone | Submit intent form → verify call rings test phone number |
| TCPA begin_message plays as first utterance | INTENT-04 | Requires hearing the call | Answer test call → verify first words are the disclosure preamble |
| AI latency < 1.5s | CALL-05 | Requires real call to measure | Time from question to AI response during live test call |
| Failure states surface correctly | CALL-08 | Requires triggering real call failures | Call disconnected number → verify UI shows "no answer" not crash |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
