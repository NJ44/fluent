import { describe, test } from 'vitest'

// Integration test requiring a running Supabase local instance.
// Run: npx supabase start
// Then set: SUPABASE_LOCAL=true npx vitest run tests/rls.test.ts

describe('voice_clones RLS', () => {
  test.skip('user A cannot read user B voice clone', async () => {
    // Requires Supabase local dev — run: npx supabase start
    // This test intentionally skipped in CI and standard test runs.
    // To run locally: SUPABASE_LOCAL=true npx vitest run tests/rls.test.ts
    // Full implementation added when local Supabase is configured.
  })
})
