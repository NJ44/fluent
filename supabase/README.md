# Supabase Migrations

## Overview

Migration files live in `supabase/migrations/` and are numbered by UTC timestamp (format: `YYYYMMDDHHMMSS_description.sql`).

## Applying Migrations

### Option 1: Supabase CLI (recommended)

```bash
# Apply to local Supabase (if running locally with supabase start):
supabase db push

# Apply to remote Supabase project:
supabase db push --db-url $SUPABASE_DB_URL
```

### Option 2: Supabase Dashboard SQL Editor

1. Open your project at https://app.supabase.com
2. Navigate to SQL Editor
3. Paste the contents of each migration file in order
4. Run each file individually

## Rules

- **Never modify applied migrations.** Once a migration has been applied to any environment, it is immutable.
- **New changes = new migration file.** Create a new numbered file for every schema change.
- **Order matters.** Files are applied in timestamp order — dependencies (e.g., `profiles` before `voice_clones`) must be reflected in file naming.

## Migration Index

| File | Creates | Key Features |
|------|---------|--------------|
| `20260504000001_create_profiles.sql` | `profiles` table | Auto-created via trigger on `auth.users` INSERT; RLS owner-only read/update |
| `20260504000002_create_voice_clones.sql` | `voice_clones` table | RLS `voice_clones_owner_only` (VOICE-08); partial unique index enforces one active clone per user; Realtime enabled |
