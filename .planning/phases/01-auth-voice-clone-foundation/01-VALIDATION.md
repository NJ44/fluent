---
phase: 1
slug: auth-voice-clone-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (matches Vite stack) |
| **Config file** | `vitest.config.ts` — Wave 0 creation needed |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/auth.test.ts tests/audio-quality.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual playback test completed
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| AUTH-01 | 01 | 1 | AUTH-01 | unit (mock) | `npx vitest run tests/auth.test.ts -t "signup"` | ❌ W0 | ⬜ pending |
| AUTH-02 | 01 | 1 | AUTH-02 | unit | `npx vitest run tests/supabase-client.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-03 | 01 | 1 | AUTH-03 | unit (mock) | `npx vitest run tests/auth.test.ts -t "logout"` | ❌ W0 | ⬜ pending |
| AUTH-04 | 01 | 1 | AUTH-04 | unit (RTL) | `npx vitest run tests/ProtectedRoute.test.tsx` | ❌ W0 | ⬜ pending |
| VOICE-03 | 02 | 2 | VOICE-03 | unit | `npx vitest run tests/audio-quality.test.ts` | ❌ W0 | ⬜ pending |
| VOICE-06 | 02 | 2 | VOICE-06 | unit (mock Supabase) | `npx vitest run tests/clone-voice-fn.test.ts -t "supersede"` | ❌ W0 | ⬜ pending |
| VOICE-07 | 02 | 2 | VOICE-07 | unit (mock) | `npx vitest run tests/clone-voice-fn.test.ts -t "delete"` | ❌ W0 | ⬜ pending |
| VOICE-08 | 02 | 2 | VOICE-08 | integration (Supabase local) | `npx vitest run tests/rls.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — no test infrastructure exists yet; create with jsdom environment
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] `tests/auth.test.ts` — stubs for AUTH-01, AUTH-02, AUTH-03
- [ ] `tests/ProtectedRoute.test.tsx` — covers AUTH-04 redirect behavior
- [ ] `tests/supabase-client.test.ts` — verifies persistSession + autoRefreshToken config
- [ ] `tests/audio-quality.test.ts` — covers VOICE-03 (rms, silenceRatio, duration thresholds)
- [ ] `tests/clone-voice-fn.test.ts` — covers VOICE-06 (supersede), VOICE-07 (delete)
- [ ] `tests/rls.test.ts` — covers VOICE-08 (requires Supabase local dev setup)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| In-browser MediaRecorder records live mic | VOICE-01 | Requires real mic hardware | Start dev server, open /onboarding, grant mic, verify recording starts and blob is captured |
| Scripted passage is shown during recording | VOICE-02 | Requires human judgment on UX | Verify passage text appears, no hard-block phonemes in script |
| Consent passphrase is randomized and recorded | VOICE-04 | Requires human judgment | Verify passphrase includes user name + date + consent wording; re-clone shows new passphrase |
| Cloned voice playback sounds like user | VOICE-05 | Requires human listening judgment | After clone, confirm preview audio plays and voice resembles recording |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
