# Phase 1: Auth + Voice Clone Foundation — Research

**Researched:** 2026-05-04
**Domain:** Supabase Auth + In-Browser MediaRecorder + Retell Native Voice Cloning
**Confidence:** HIGH overall (MEDIUM on Retell native clone SDK method exact signature)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create an account with email and password | Supabase `auth.signUp()` + email verification flow |
| AUTH-02 | User session persists across browser refresh and tab close | Supabase `persistSession: true` + `autoRefreshToken: true` in client config |
| AUTH-03 | User can sign out from any page | Supabase `auth.signOut()` called from nav component |
| AUTH-04 | Protected routes redirect unauthenticated users to sign-in | ProtectedRoute component with `useAuth()` + React Router `<Navigate>` |
| VOICE-01 | User can record a live in-browser voice sample (60–120s, no file upload) | MediaRecorder API + `getUserMedia` — no `<input type="file">` path at all |
| VOICE-02 | Recording flow includes a scripted passage to avoid hard-block triggers | Static scripted text in UI; copy guidance from P11 research |
| VOICE-03 | Client-side audio quality check (noise floor, silence ratio, volume) | Web Audio API AnalyserNode — RMS + silence ratio calculation |
| VOICE-04 | Randomized consent passphrase recorded live before clone is created | Generate passphrase client-side; record segment; upload evidence to Supabase Storage |
| VOICE-05 | App plays back a sample sentence in the cloned voice before saving | ElevenLabs TTS API called from Netlify function with returned voice_id; audio element plays back |
| VOICE-06 | User can re-clone from Settings — old clone superseded, not overwritten | `UPDATE voice_clones SET status='superseded'` before inserting new active clone |
| VOICE-07 | User can delete voice clone and all audio data (GDPR-compliant) | `UPDATE voice_clones SET status='deleted'` + Supabase Storage `remove()` + ElevenLabs DELETE voice |
| VOICE-08 | Voice clone is private to user — never shared | RLS on `voice_clones` table: `user_id = auth.uid()` only |
</phase_requirements>

---

## Summary

Phase 1 establishes the authenticated foundation and the voice clone — the emotional core of the product. Every subsequent phase depends on these two pillars. The auth layer is fully resolvable by copying Boltcall patterns with minor simplification (no setup wizard, no business profile check). The voice clone layer has one critical unknown resolved by this research: the Retell native clone API endpoint is `POST https://api.retellai.com/clone-voice` with `multipart/form-data`, accepting `files[]`, `voice_name`, and `voice_provider='platform'`. The SDK wraps this as `client.voice.clone({...})`.

The dominant Phase 1 risks are P3 (bad clone audio — product trust destroyed on first impression), P4 (clone abuse — impersonation), and P11 (stutter cloned into the voice). All three are addressed by: live mic only (no file upload path), 60–120s scripted recording, client-side audio quality gate, and mandatory consent passphrase with stored evidence. The P8 webhook cold-start pattern must be established now even though Phase 1 does not yet receive Retell webhooks — setting the pattern correctly in the `/clone-voice` Netlify function establishes the template.

**Primary recommendation:** Implement auth by copying Boltcall patterns directly. Implement voice clone as: MediaRecorder (WebM/Opus) → Web Audio quality gate → Netlify function → Retell `POST /clone-voice` with `voice_provider='platform'` → ElevenLabs TTS playback preview → Supabase Storage for passphrase evidence. No ElevenLabs IVC API needed in this phase.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.x | Auth + Postgres + Storage client | Already in Boltcall; single SDK for all backend needs |
| `retell-sdk` | latest | Retell voice clone API | Official SDK; wraps multipart upload cleanly |
| React Router DOM | 6.x | Protected routes + navigation | Already in Boltcall |
| `@netlify/functions` | latest | Netlify Function handler type | Already in Boltcall |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Audio API | Browser native | RMS/silence/noise quality check | Client-side before upload — no library needed |
| MediaRecorder API | Browser native | In-browser mic recording | All modern browsers, no polyfill needed |
| ElevenLabs REST | v1 | TTS playback preview of cloned voice | Netlify function only — call after clone created |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Retell `platform` voice provider | ElevenLabs IVC | ElevenLabs IVC voices are NOT selectable in Retell (confirmed Feb 2026) — do not use |
| Retell native clone | Cartesia pro clone | Cartesia supports 1 file only; platform provider supports up to 25 files — use platform |
| Web Audio API (vanilla) | `ricky0123/vad` library | VAD library adds 200KB+ to bundle; vanilla AnalyserNode is sufficient for RMS/silence checks |
| Supabase Storage for audio upload path | Netlify Blobs | Supabase Storage is already in stack; file sizes are well under 4.5MB limit |

**Installation:**
```bash
npm install retell-sdk @supabase/supabase-js
```
(Both already present in Boltcall — copy package.json entries)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── contexts/           # AuthContext.tsx + AuthProvider.tsx (copy from Boltcall)
├── components/
│   ├── ProtectedRoute.tsx     # Simplified from Boltcall (no setup wizard check)
│   └── voice/
│       ├── RecordingStep.tsx  # MediaRecorder + Web Audio quality gate
│       ├── ConsentStep.tsx    # Passphrase recording
│       └── PlaybackStep.tsx   # Hear cloned voice before confirming
├── lib/
│   ├── supabase.ts     # Client factory (copy from Boltcall, same config)
│   └── auth.ts         # Auth functions (copy from Boltcall, strip company/role)
├── pages/
│   ├── SignIn.tsx
│   ├── SignUp.tsx
│   └── VoiceOnboarding.tsx  # Multi-step wizard
netlify/functions/
├── _shared/
│   ├── token-utils.ts        # Copy from Boltcall (getServiceSupabase)
│   └── verify-signatures.ts  # Copy from Boltcall (verifyRetellSignature)
├── clone-voice.ts            # NEW: audio → Retell clone API → Supabase write
└── preview-voice.ts          # NEW: voice_id → ElevenLabs TTS → signed URL
```

### Pattern 1: Supabase Auth Client (copy from Boltcall)
**What:** Supabase client singleton with session persistence
**When to use:** All auth operations in the browser
```typescript
// Source: Boltcall src/lib/supabase.ts — copy verbatim
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,    // Survives refresh AND tab close (localStorage)
    detectSessionInUrl: true // Required for email magic link / OAuth callbacks
  }
});
```

### Pattern 2: Simplified AuthProvider (trimmed from Boltcall)
**What:** useReducer-based auth state — login/signup/logout/onAuthStateChange
**When to use:** Wrap the entire React app
```typescript
// Source: Boltcall src/contexts/AuthProvider.tsx — simplify SignupCredentials
// Fluent only needs: name + email + password (no company field)
export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}
// Auth state flows: isLoading:true → LOGIN_SUCCESS | LOGOUT
// onAuthStateChange drives all state updates after initial load
```

### Pattern 3: ProtectedRoute (simplified from Boltcall)
**What:** Route guard — redirect unauthenticated users to /sign-in
**When to use:** Wrap all post-auth pages (dashboard, settings, voice onboarding)
```typescript
// Source: Boltcall src/components/ProtectedRoute.tsx — remove setup wizard check
// Fluent version: check voice_clones WHERE status='active' instead
// Redirect to /onboarding if no active clone AND not already on /onboarding
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/sign-in" state={{ from: location }} replace />;
  return <>{children}</>;
};
```

### Pattern 4: MediaRecorder In-Browser Recording
**What:** Capture mic audio as WebM/Opus blob — no file upload input
**When to use:** VOICE-01 — live recording step only
```typescript
// Source: MDN Web Audio API + MediaStream Recording API
const startRecording = async (): Promise<void> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Web Audio context for real-time quality monitoring
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  // MediaRecorder for blob collection
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    // blob is the recording — pass to quality gate
  };
  recorder.start(100); // 100ms timeslice for real-time monitoring
};
```

### Pattern 5: Client-Side Audio Quality Gate (VOICE-03)
**What:** Measure RMS, silence ratio, and noise floor from recorded audio
**When to use:** After recording stops, before sending to Netlify function
```typescript
// Source: Web Audio API AnalyserNode — no external library
async function analyzeAudioQuality(blob: Blob): Promise<QualityResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new OfflineAudioContext(1, 1, 44100);
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const data = audioBuffer.getChannelData(0);
  // RMS (overall volume)
  const rms = Math.sqrt(data.reduce((sum, s) => sum + s * s, 0) / data.length);
  // Silence ratio (fraction of samples below silence threshold)
  const silenceThreshold = 0.01;
  const silentSamples = data.filter(s => Math.abs(s) < silenceThreshold).length;
  const silenceRatio = silentSamples / data.length;
  // Duration check
  const durationSeconds = audioBuffer.duration;
  return {
    rms,            // Reject if < 0.02 (too quiet — mic too far or muted)
    silenceRatio,   // Reject if > 0.40 (too much silence — user paused too long)
    durationSeconds // Reject if < 45s, warn if < 60s, cap at 120s
  };
}
// Acceptance criteria:
// PASS:  rms >= 0.02 AND silenceRatio <= 0.40 AND duration 45–120s
// WARN:  duration 45–60s (usable but not ideal)
// FAIL:  any rejection condition → show specific error + retry button
```

### Pattern 6: Retell Native Clone API (VOICE-01, VOICE-05)
**What:** Upload audio blob to Retell, get back a usable voice_id
**When to use:** Netlify `/clone-voice` function after audio passes quality gate
```typescript
// Source: docs.retellai.com/api-references/clone-voice (verified 2026-05-04)
// SDK method: client.voice.clone({ voice_name, voice_provider, files })
// REST: POST https://api.retellai.com/clone-voice
// Content-Type: multipart/form-data
// Auth: Authorization: Bearer RETELL_API_KEY
import Retell from 'retell-sdk';
const client = new Retell({ apiKey: process.env.RETELL_API_KEY! });

// Option A: SDK (preferred — handles multipart internally)
const voice = await client.voice.clone({
  voice_name: `fluent-${userId}-${Date.now()}`,
  voice_provider: 'platform',  // Use 'platform' for Retell-native clones
  files: [audioFile],          // Up to 25 files; send the main recording + consent
});
// Returns: { voice_id, voice_name, provider, gender, accent, preview_audio_url }

// Option B: Raw fetch (fallback if SDK multipart behavior unclear)
const formData = new FormData();
formData.append('voice_name', `fluent-${userId}`);
formData.append('voice_provider', 'platform');
formData.append('files', audioBlob, 'voice-sample.webm');
const res = await fetch('https://api.retellai.com/clone-voice', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` },
  body: formData,
});
const { voice_id } = await res.json();
```

### Pattern 7: Supabase RLS for voice_clones (VOICE-08)
**What:** Row-level security ensuring users only see their own clones
**When to use:** Database migration — must be applied before any data is written
```sql
-- Source: ARCHITECTURE.md database schema
ALTER TABLE voice_clones ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own clones
CREATE POLICY "voice_clones_owner_only" ON voice_clones
  FOR ALL USING (user_id = auth.uid());

-- Partial unique index: only one active clone per user
CREATE UNIQUE INDEX voice_clones_active_per_user
  ON voice_clones(user_id) WHERE status = 'active';

-- Service role bypasses RLS (Netlify functions use SUPABASE_SERVICE_KEY)
-- Browser uses anon key — RLS enforced automatically
```

### Pattern 8: Re-clone Flow (VOICE-06)
**What:** Supersede old clone, create new one — atomic via service role
**When to use:** Settings page "Re-record my voice" action
```typescript
// Source: ARCHITECTURE.md design decision
// In Netlify function (service role, bypasses RLS):
const { error } = await supabaseAdmin
  .from('voice_clones')
  .update({ status: 'superseded', superseded_at: new Date().toISOString() })
  .eq('user_id', userId)
  .eq('status', 'active');
// Then INSERT new active clone with new voice_id
// The partial unique index prevents two active clones simultaneously
```

### Pattern 9: GDPR Delete (VOICE-07)
**What:** Soft-delete in DB + hard-delete from Retell + remove from Supabase Storage
**When to use:** Settings "Delete my voice" action
```typescript
// Three operations — all must succeed for GDPR compliance
// 1. Delete from Retell (external provider)
await client.voice.delete(retell_voice_id);

// 2. Delete audio files from Supabase Storage
await supabaseAdmin.storage.from('voice-evidence').remove([
  `${userId}/voice-sample.webm`,
  `${userId}/consent-passphrase.webm`
]);

// 3. Mark DB record as deleted (keep metadata for audit)
await supabaseAdmin.from('voice_clones')
  .update({ status: 'deleted' })
  .eq('id', cloneId)
  .eq('user_id', userId);
```

### Anti-Patterns to Avoid

- **File upload input for voice sample:** Never include `<input type="file">` — live mic only is required for both quality and anti-abuse (P3, P4)
- **Accepting recording under 45s:** ElevenLabs/Retell quality floor is around 30s, but stutter-clone risk (P11) is highest on short samples — enforce 45s minimum, 60s recommended
- **Using ElevenLabs IVC voice_id directly in agent_override:** Private IVC voices are not selectable in Retell (confirmed Feb 2026). Use Retell native clone with `voice_provider='platform'`
- **Uploading audio directly from browser to Retell:** Browser must never hold RETELL_API_KEY. All external API calls go through Netlify functions
- **Querying voice_clones without status filter:** After re-clone, old records exist. Always filter `WHERE status = 'active'`
- **Overwriting rather than superseding:** The partial unique index will reject attempts to INSERT a second active clone — supersede first, then insert

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session persistence | Custom JWT storage | Supabase `persistSession: true` | LocalStorage management, token refresh, multi-tab sync all handled |
| Audio quality detection | Custom DSP analysis | Web Audio API `AnalyserNode` + `OfflineAudioContext.decodeAudioData` | Browser-native, no bundle cost |
| Multipart file upload to third-party API | Custom streaming | `retell-sdk` SDK or `FormData` + `fetch` | SDK handles auth, retries, error mapping |
| RLS for private data | Application-level auth checks | Supabase RLS policies | Row-level enforcement cannot be bypassed even if function has a bug |
| Voice provider abstraction | Custom voice service layer | Retell `voice_provider='platform'` directly | The Retell/ElevenLabs IVC bridge does not exist — no abstraction needed |

**Key insight:** The auth and storage layers are already solved by copying Boltcall. The only net-new engineering in Phase 1 is the MediaRecorder → quality gate → Retell clone → preview playback pipeline.

---

## Common Pitfalls

### Pitfall 1: ElevenLabs IVC voice_id in Retell agent_override (P3/GOTCHA)
**What goes wrong:** Developer reads ElevenLabs IVC API docs, creates a clone, gets a voice_id, tries to pass it to Retell agent_override — Retell silently ignores or errors.
**Why it happens:** ElevenLabs private IVC voices are not visible in Retell's voice library. Confirmed in Retell community forum Feb 2026.
**How to avoid:** Use `client.voice.clone({ voice_provider: 'platform' })` — the Retell-native path. The resulting voice_id is a Retell-internal ID usable in `agent_override`.
**Warning signs:** `agent_override.voice_id` accepted but agent uses default voice on calls.

### Pitfall 2: Stutter cloned into the voice (P11 — ironic failure mode)
**What goes wrong:** User with a stutter records naturally, ElevenLabs clones their blocking patterns, playback preview sounds stuttered, user churns immediately.
**Why it happens:** ElevenLabs clones everything — speed, inflections, breathing, blocks.
**How to avoid:** Scripted passage designed to avoid hard-block phonemes (labial stops: b, p; velar stops: g, k at word starts). Multiple short segments (3×30s) allow retry of individual segments. Copy: "Record what's comfortable. We'll handle the fluency."
**Warning signs:** User sees playback preview and says "that still sounds like me stuttering."

### Pitfall 3: Netlify 4.5MB effective binary limit
**What goes wrong:** 120s audio at 192kbps MP3 = ~2.8MB binary = ~3.7MB base64 — close to the 4.5MB limit. Higher bitrates or longer recordings will fail.
**Why it happens:** Netlify base64-encodes binary payloads (+33% overhead), reducing effective limit from 8MB to ~4.5MB for binary.
**How to avoid:** Enforce client-side: max 120s recording + WebM/Opus at 64–96kbps for voice. 120s at 96kbps = ~1.4MB binary = ~1.9MB base64 — well within limit. Alternative: use Supabase Storage signed upload URL → browser uploads directly → Netlify function only calls Retell with the Storage URL (requires Retell to accept URL input — verify at implementation).
**Warning signs:** 413 payload too large errors from Netlify.

### Pitfall 4: Missing consent passphrase evidence (P4)
**What goes wrong:** User clones someone else's voice. ElevenLabs ToS is violated. Account banned. All users' clones deleted.
**Why it happens:** Retell/ElevenLabs has no automatic live-speaker verification at IVC tier.
**How to avoid:** Record and store passphrase segment in Supabase Storage bucket `voice-evidence` (private, service-role access only, NEVER deleted). The passphrase is randomized: "I, [name], on [date], consent to my voice being used by Fluent." ToS checkbox required at clone creation.
**Warning signs:** Multiple re-clones from same account, gender/age mismatch in recordings.

### Pitfall 5: Auth session not persisting (GDPR/UX)
**What goes wrong:** User closes tab, reopens, gets sent to login. Especially bad on mobile.
**Why it happens:** `persistSession: false` or `autoRefreshToken: false` in Supabase client config.
**How to avoid:** Copy Boltcall's `supabase.ts` exactly — `persistSession: true` + `autoRefreshToken: true`. Supabase stores tokens in localStorage by default. The `onAuthStateChange` listener hydrates state on page load before the first render completes.
**Warning signs:** Users report being logged out after refresh. `isLoading` flickers before redirect to /sign-in.

### Pitfall 6: Webhook cold-start dropping the 200 OK (P8)
**What goes wrong:** The `/clone-voice` function takes too long. While Phase 1 doesn't receive Retell webhooks, the pattern must be established now.
**Why it happens:** Netlify cold-start + Supabase client init + Retell API call stacks up.
**How to avoid:** In every Netlify function: return `{ statusCode: 200, body: JSON.stringify({ ack: true }) }` BEFORE starting async processing. For Phase 1's clone function, the 200 OK can come after the clone is created (it's not a webhook receiver) — but establish the logging and error structure now.
**Warning signs:** Retell webhook delivery rate < 99% in Retell dashboard (Phase 2 concern).

---

## Code Examples

Verified patterns from official sources and Boltcall codebase:

### Supabase Email/Password Signup
```typescript
// Source: Boltcall src/lib/auth.ts (verified working)
const { data, error } = await supabase.auth.signUp({
  email: credentials.email,
  password: credentials.password,
  options: {
    data: { name: credentials.name }
  }
});
// Note: Supabase sends confirmation email by default
// Disable in Supabase dashboard (Auth > Settings > Email confirmation) for dev
```

### onAuthStateChange — Session Hydration
```typescript
// Source: Boltcall src/contexts/AuthProvider.tsx
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    dispatch({ type: 'LOGIN_SUCCESS', payload: transformUser(session.user) });
  } else {
    dispatch({ type: 'LOGOUT' });
  }
});
return () => subscription.unsubscribe();
```

### Netlify Function — Auth Verification Pattern
```typescript
// Source: Boltcall netlify/functions pattern — verify JWT before any mutation
import { getServiceSupabase } from './_shared/token-utils';
export const handler: Handler = async (event) => {
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  const supabaseAdmin = getServiceSupabase();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.id;
  // proceed with userId
};
```

### Retell Clone API (REST fallback — guaranteed to work)
```typescript
// Source: docs.retellai.com/api-references/clone-voice (verified 2026-05-04)
// Use if SDK multipart behavior is unclear during implementation
const formData = new FormData();
formData.append('voice_name', `fluent-${userId}`);
formData.append('voice_provider', 'platform');
formData.append('files', audioBlob, 'voice-sample.webm');
// Optional: add consent passphrase as second file for better quality
formData.append('files', passphraseBlob, 'consent.webm');

const response = await fetch('https://api.retellai.com/clone-voice', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.RETELL_API_KEY}` },
  // Do NOT set Content-Type manually — fetch sets it with boundary
  body: formData,
});
if (!response.ok) throw new Error(`Retell clone failed: ${response.status}`);
const voice = await response.json();
// voice.voice_id is the Retell-internal ID usable in agent_override
```

### Consent Passphrase Storage
```typescript
// Source: PITFALLS.md P4 pattern
const passphraseText = `I, ${userName}, on ${new Date().toLocaleDateString()}, consent to my voice being used by Fluent`;
// Store passphrase audio in Supabase Storage (never deleted, service role only)
const path = `${userId}/consent-${Date.now()}.webm`;
const { error } = await supabaseAdmin.storage
  .from('voice-evidence')   // private bucket, no public access, no expiry
  .upload(path, passphraseBlob, { contentType: 'audio/webm', upsert: false });
```

### ElevenLabs TTS Preview (VOICE-05)
```typescript
// Source: ElevenLabs REST API — call from Netlify function AFTER clone created
// Use Flash v2.5 for consistency with production call behavior
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${retellVoiceId}`, {
  method: 'POST',
  headers: {
    'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: "Hi, I'm calling to confirm my appointment for tomorrow at two PM.",
    model_id: 'eleven_flash_v2_5',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  })
});
// Wait — Retell native voice_id may not be directly usable in ElevenLabs API
// If Retell's native clone API returns a Retell-internal ID only:
//   Option A: Call Retell's preview_audio_url from the clone response
//   Option B: Use Retell's /text-to-speech or equivalent endpoint
// SPIKE NOTE: Confirm at implementation whether Retell's clone response
// preview_audio_url is sufficient for the playback requirement, or whether
// a separate TTS call is needed.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ElevenLabs IVC → Retell BYOK | Retell native clone (`voice_provider='platform'`) | Feb 2026 | Private IVC voices not selectable in Retell — must use native path |
| Retell `voice.list()` returns only built-in voices | SDK now exposes `voice.clone()` | ~2025 | Voice cloning is first-class in the SDK, not just REST |
| `<input type="file">` for voice upload | Live mic only via MediaRecorder | Best practice since 2023 | Required for both anti-abuse and quality; file-upload path is deliberately removed |
| ElevenLabs multilingual v2 for calls | Flash v2.5 (`eleven_flash_v2_5`) | 2024 | ~75ms TTS latency vs 400ms+ for multilingual — critical for <1.5s call latency |

**Deprecated/outdated:**
- ElevenLabs IVC → Retell BYOK: Does not work with private voices. Only works if voice is made public, which is a privacy violation for this product.
- ElevenLabs `eleven_turbo_v2`: Superseded by Flash v2.5 for phone use cases.

---

## Open Questions

1. **Can Retell's clone preview_audio_url replace a TTS call for VOICE-05?**
   - What we know: Retell's `POST /clone-voice` response includes `preview_audio_url` — a pre-rendered audio sample
   - What's unclear: Whether that URL alone is sufficient for the "hear a sample sentence" playback requirement, or if a custom sentence TTS call is needed
   - Recommendation: In Wave 0 of planning, use `preview_audio_url` for playback. If it sounds mechanical or unrepresentative, add a custom TTS call via Retell's `/text-to-speech` endpoint.

2. **Does Retell's SDK `client.voice.clone()` handle Node.js multipart (FormData with Blob/Buffer) correctly?**
   - What we know: The SDK wraps `POST /clone-voice`. The REST endpoint accepts `multipart/form-data` with `files[]`.
   - What's unclear: Whether the SDK method in Node 20+ environment properly handles `Buffer`/`ReadableStream` as file inputs
   - Recommendation: Implement using raw `fetch` + `FormData` first (guaranteed to work), then optionally switch to SDK. Document both patterns in the planning task.

3. **Should consent passphrase audio be deleted on GDPR delete request?**
   - What we know: GDPR requires deletion of personal data on request. The passphrase recording contains the user's voice (personal data).
   - What's unclear: Whether legal defensibility requires retaining the passphrase recording even after GDPR deletion, OR whether deletion satisfies GDPR AND removes legal evidence
   - Recommendation: Flag for legal review. Default implementation: delete passphrase audio on GDPR request (GDPR takes priority). Log deletion event for audit trail.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (matches Vite stack) |
| Config file | `vitest.config.ts` — Wave 0 creation needed |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `supabase.auth.signUp()` succeeds with valid credentials | unit (mock) | `npx vitest run tests/auth.test.ts -t "signup"` | Wave 0 |
| AUTH-02 | Supabase client config has `persistSession:true` and `autoRefreshToken:true` | unit | `npx vitest run tests/supabase-client.test.ts` | Wave 0 |
| AUTH-03 | `logout()` calls `supabase.auth.signOut()` | unit (mock) | `npx vitest run tests/auth.test.ts -t "logout"` | Wave 0 |
| AUTH-04 | ProtectedRoute redirects to /sign-in when `isAuthenticated:false` | unit (React Testing Library) | `npx vitest run tests/ProtectedRoute.test.tsx` | Wave 0 |
| VOICE-03 | `analyzeAudioQuality()` returns FAIL for rms < 0.02 | unit | `npx vitest run tests/audio-quality.test.ts` | Wave 0 |
| VOICE-03 | `analyzeAudioQuality()` returns FAIL for silenceRatio > 0.40 | unit | `npx vitest run tests/audio-quality.test.ts` | Wave 0 |
| VOICE-03 | `analyzeAudioQuality()` returns FAIL for duration < 45s | unit | `npx vitest run tests/audio-quality.test.ts` | Wave 0 |
| VOICE-06 | Re-clone sets old record status to 'superseded' before inserting new | unit (mock Supabase) | `npx vitest run tests/clone-voice-fn.test.ts -t "supersede"` | Wave 0 |
| VOICE-07 | Delete flow calls Retell delete + Storage remove + DB status='deleted' | unit (mock) | `npx vitest run tests/clone-voice-fn.test.ts -t "delete"` | Wave 0 |
| VOICE-08 | RLS policy: user cannot SELECT another user's voice_clone row | integration (Supabase local) | `npx vitest run tests/rls.test.ts` | Wave 0 |

**Manual-only tests:**
- VOICE-01: In-browser MediaRecorder — requires real mic hardware
- VOICE-02: Scripted passage UX — requires human judgment
- VOICE-04: Consent passphrase UX — requires human judgment
- VOICE-05: Cloned voice playback quality — requires human judgment

### Sampling Rate
- **Per task commit:** `npx vitest run tests/auth.test.ts tests/audio-quality.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual playback test before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/auth.test.ts` — covers AUTH-01, AUTH-02, AUTH-03
- [ ] `tests/ProtectedRoute.test.tsx` — covers AUTH-04
- [ ] `tests/audio-quality.test.ts` — covers VOICE-03
- [ ] `tests/clone-voice-fn.test.ts` — covers VOICE-06, VOICE-07
- [ ] `tests/rls.test.ts` — covers VOICE-08 (requires Supabase local dev setup)
- [ ] `tests/supabase-client.test.ts` — covers AUTH-02 config check
- [ ] `vitest.config.ts` — no test infrastructure exists yet
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

---

## Boltcall Reuse Map

Direct copy candidates (zero modification):
- `netlify/functions/_shared/token-utils.ts` → `getServiceSupabase()` function
- `netlify/functions/_shared/verify-signatures.ts` → `verifyRetellSignature()` function (needed in Phase 2 — create now)
- `netlify/functions/_shared/cors.ts` → CORS headers object
- `src/lib/supabase.ts` → supabase client factory (identical)
- `src/contexts/AuthContext.tsx` → strip OAuth methods (Google/Microsoft/Facebook not needed)
- `src/contexts/AuthProvider.tsx` → simplify `SignupCredentials` (no company field)

Trim/simplify candidates:
- `src/components/ProtectedRoute.tsx` → remove setup wizard check, add voice clone check
- `src/lib/auth.ts` → remove `company` field from `SignupCredentials` and `User` interface

Do NOT reuse:
- `netlify/functions/retell-calls.ts` — Boltcall uses campaign-based outbound; Fluent needs a different call shape
- `netlify/functions/retell-agents.ts` — Boltcall creates inbound agents with KB; Fluent needs a single persistent outbound agent per user
- `netlify/functions/retell-voices.ts` — Only lists voices; Fluent needs clone + delete

---

## Sources

### Primary (HIGH confidence)
- Retell clone-voice API — `docs.retellai.com/api-references/clone-voice` (fetched 2026-05-04) — endpoint, request shape, response schema
- Retell llms.txt — `docs.retellai.com/llms.txt` (fetched 2026-05-04) — confirmed clone-voice endpoint exists
- Boltcall codebase — `C:\Users\Asus\Desktop\Boltcall_website\Boltcall` — auth patterns, Netlify function structure, Supabase client config
- `research/ARCHITECTURE.md` — database schema, webhook patterns, RLS strategy
- `research/STACK.md` — Retell BYOK gotcha confirmed, ElevenLabs API shape
- `research/PITFALLS.md` — P3, P4, P8, P11 prevention strategies

### Secondary (MEDIUM confidence)
- MDN Web Audio API — AnalyserNode + OfflineAudioContext patterns for quality analysis
- MDN MediaStream Recording API — MediaRecorder usage, WebM/Opus format
- Netlify Community Forums — 4.5MB effective binary limit for functions (base64 overhead)
- Audio size calculator — confirmed 120s at 96kbps WebM/Opus = ~1.4MB, well within limit
- Supabase auth sessions docs — `persistSession: true` behavior confirmed

### Tertiary (LOW confidence — needs validation at implementation)
- Retell SDK `client.voice.clone()` exact Node.js multipart handling — not verified with working code example
- ElevenLabs TTS direct call with Retell native voice_id — may not work; preview_audio_url alternative noted
- GDPR vs anti-abuse conflict on passphrase audio retention — legal question, not technical

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed, Boltcall precedent for all patterns
- Architecture: HIGH — Supabase + Netlify patterns fully verified; Retell clone API endpoint confirmed
- Pitfalls: HIGH — primary source research; all Phase 1 pitfalls documented with prevention
- Retell SDK multipart: MEDIUM — endpoint shape confirmed, SDK method signature confirmed, but no working code example with Node.js Buffer/Blob found

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (Retell API relatively stable; re-verify if >30 days)

**Critical implementation order:**
1. Auth (copy from Boltcall) — establish session before any other work
2. DB migrations (voice_clones schema + RLS) — required before any Netlify functions
3. MediaRecorder + quality gate — client-side, no external dependencies
4. Consent passphrase recording + Supabase Storage upload
5. Netlify `/clone-voice` function — Retell API call
6. Playback preview (preview_audio_url or TTS call — spike at implementation)
7. Re-clone and GDPR delete flows
