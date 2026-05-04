-- profiles: one row per auth.users row
-- Populated by trigger on auth.users INSERT
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  name           text,
  plan           text not null default 'free',       -- free | premium | pro
  plan_renews_at timestamptz,
  created_at     timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS: users can read their own profile
alter table profiles enable row level security;
create policy "profiles_owner_read" on profiles
  for select using (id = auth.uid());
create policy "profiles_owner_update" on profiles
  for update using (id = auth.uid());
