-- MPL live scores (football and volleyball) -----------------------------------
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (nothing is lost if the tables already exist, and the
-- scorer's ID and password are NOT changed).
--
-- Who can do what:
--   * EVERYONE sees exactly the same scores, live. Nothing to sign in to, no sign-up.
--   * Only the scorer can CHANGE a score: there is ONE login (an ID and a password), and this
--     database checks it on every change. No accounts can be created. Hiding the scoring page
--     is not what protects the scores; this check is.

create extension if not exists pgcrypto with schema extensions;

-- 1. The scores. One row per match; the id is the one in src/data/fixtures.json.
--    Only a log is stored (events / points); the score itself is worked out from it.
create table if not exists public.live_matches (
  id                text primary key check (id ~ '^(football|volleyball)-[0-9]{1,3}$'),
  status            text not null default 'upcoming' check (status in ('upcoming', 'live', 'break', 'finished')),
  period            text check (period in ('1H', '2H')),
  period_started_at timestamptz,
  events            jsonb not null default '[]'::jsonb check (case when jsonb_typeof(events) = 'array' then jsonb_array_length(events) <= 300 else false end), -- football: goals and cards
  points            text not null default '' check (points ~ '^[ab]*$' and char_length(points) <= 600),                                                        -- volleyball: one letter per rally
  updated_at        timestamptz not null default now()
);

-- 2. The scorer login (one row). The password is stored only as a hash; nobody can read this table
--    through the website.
create table if not exists public.live_settings (
  id int primary key default 1 check (id = 1)
);
alter table public.live_settings add column if not exists scorer_user text;
alter table public.live_settings add column if not exists scorer_hash text;
-- The first version of this setup used a secret link instead of a login; drop its column if it was ever created.
alter table public.live_settings drop column if exists scorer_key;

-- The sample login: ID "mplscorer". Its password was given to the organiser separately; change it (see the end of this file).
insert into public.live_settings (id, scorer_user, scorer_hash)
values (1, 'mplscorer', '$2a$10$6mM4FuYdiuOHN/kyIsnd6usjC2yOwGa7TWhjXEbXlJEjfDnQcuQdO')
on conflict (id) do update set
  scorer_user = coalesce(public.live_settings.scorer_user, excluded.scorer_user),
  scorer_hash = coalesce(public.live_settings.scorer_hash, excluded.scorer_hash);

alter table public.live_settings alter column scorer_user set not null;
alter table public.live_settings alter column scorer_hash set not null;

-- 3. Access rules. Everyone may READ the scores. Nobody may write to the tables directly;
--    changes go through live_save() below, which needs the login.
alter table public.live_matches enable row level security;
alter table public.live_settings enable row level security;   -- no policy on purpose: the login can never be read through the API

drop policy if exists "Anyone can read live scores" on public.live_matches;
create policy "Anyone can read live scores"
  on public.live_matches for select
  using (true);

create or replace function public.touch_live_match()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists live_matches_touch on public.live_matches;
create trigger live_matches_touch
  before insert or update on public.live_matches
  for each row execute function public.touch_live_match();

-- 4. The things the scoring page may do. (The first version used a key instead of a login; those
--    functions are replaced.)
drop function if exists public.live_check_key(text);
drop function if exists public.live_save(text, text, text, text, timestamptz, jsonb, text);
drop function if exists public.live_save_squads(text, text, jsonb);

--    live_check_login: "is this ID and password right?" (so the page can say so)
create or replace function public.live_check_login(p_user text, p_password text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.live_settings
    where id = 1
      and lower(scorer_user) = lower(coalesce(p_user, ''))
      and scorer_hash = crypt(coalesce(p_password, ''), scorer_hash)
  );
$$;

--    live_save: write a match's state, only with the right login
create or replace function public.live_save(
  p_user text,
  p_password text,
  p_id text,
  p_status text,
  p_period text,
  p_period_started_at timestamptz,
  p_events jsonb,
  p_points text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.live_check_login(p_user, p_password) then
    raise exception 'wrong login' using errcode = '42501';
  end if;

  insert into public.live_matches (id, status, period, period_started_at, events, points)
  values (p_id, p_status, p_period, p_period_started_at, coalesce(p_events, '[]'::jsonb), coalesce(p_points, ''))
  on conflict (id) do update set
    status = excluded.status,
    period = excluded.period,
    period_started_at = excluded.period_started_at,
    events = excluded.events,
    points = excluded.points;
end;
$$;

-- 5. Squads, so the scorer can pick a goal scorer from the team's players.
--    One row per sport: { "<team id>": ["Player name", ...], ... }. Everyone can read them.
create table if not exists public.live_squads (
  sport      text primary key check (sport in ('football', 'volleyball')),
  squads     jsonb not null default '{}'::jsonb check (jsonb_typeof(squads) = 'object' and octet_length(squads::text) < 60000),
  updated_at timestamptz not null default now()
);

alter table public.live_squads enable row level security;

drop policy if exists "Anyone can read squads" on public.live_squads;
create policy "Anyone can read squads"
  on public.live_squads for select
  using (true);

create or replace function public.live_save_squads(p_user text, p_password text, p_sport text, p_squads jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.live_check_login(p_user, p_password) then
    raise exception 'wrong login' using errcode = '42501';
  end if;

  insert into public.live_squads (sport, squads, updated_at)
  values (p_sport, coalesce(p_squads, '{}'::jsonb), now())
  on conflict (sport) do update set squads = excluded.squads, updated_at = now();
end;
$$;

-- 6. The server's clock. The match clock counts from the moment a half kicked off, so every phone
--    needs the same idea of "now"; the pages use this to correct for a phone whose clock is wrong.
create or replace function public.live_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

-- 7. Live updates: push every change to everyone watching.
alter table public.live_matches replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.live_matches;
exception when duplicate_object then
  null; -- already added
end $$;

-- 8. Changing the scorer's ID or password (run this line on its own, with your own values).
--    Use a LONG password: this is a public website.
--
--    set search_path to public, extensions;
--    update public.live_settings
--       set scorer_user = 'newid', scorer_hash = crypt('a-long-new-password', gen_salt('bf'))
--     where id = 1;
