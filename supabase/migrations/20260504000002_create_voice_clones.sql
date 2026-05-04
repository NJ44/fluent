-- voice_clones: one active clone per user at any time
-- status: active | superseded | deleted
create table if not exists voice_clones (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  retell_voice_id text not null,
  name            text not null default 'My voice',
  sample_url      text,          -- Supabase Storage path (consent evidence)
  status          text not null default 'active'
                  check (status in ('active', 'superseded', 'deleted')),
  created_at      timestamptz not null default now(),
  superseded_at   timestamptz
);

-- Enforce: only one active clone per user
create unique index voice_clones_active_per_user
  on voice_clones(user_id) where status = 'active';

-- RLS: users can only see/modify their own clones (VOICE-08)
alter table voice_clones enable row level security;

create policy "voice_clones_owner_only" on voice_clones
  for all using (user_id = auth.uid());

-- Enable Realtime for future phases (transcript streaming in Phase 3)
-- Not needed in Phase 1 but no cost to enable early
alter publication supabase_realtime add table voice_clones;
