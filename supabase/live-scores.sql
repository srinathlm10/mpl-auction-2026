-- MPL live scores (football and volleyball) -----------------------------------
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (nothing is lost if the tables already exist, and the
-- scoring key is NOT changed).
--
-- No accounts, no sign-up, no login:
--   * EVERYONE sees exactly the same scores, live, with nothing to sign in to.
--   * The scores can only be CHANGED by someone who has the private scoring key
--     (it is inside the private scoring link you give to the scorers).
--     The check happens here in the database, so hiding the page is not what protects the scores.

-- 1. The scores. One row per match; the id is the one in src/data/fixtures.json.
--    Only a log is stored (events / points); the score itself is worked out from it.
create table if not exists public.live_matches (
  id                text primary key check (id ~ '^(football|volleyball)-[0-9]{1,3}$'),
  status            text not null default 'upcoming' check (status in ('upcoming', 'live', 'break', 'finished')),
  period            text check (period in ('1H', '2H')),
  period_started_at timestamptz,
  events            jsonb not null default '[]'::jsonb check (case when jsonb_typeof(events) = 'array' then jsonb_array_length(events) <= 300 else false end), -- football: goals and cards
  points            text not null default '' check (points ~ '^[ab]*$' and char_length(points) <= 600),                          -- volleyball: one letter per rally
  updated_at        timestamptz not null default now()
);

-- 2. The private scoring key (one row). Created once, at random; nobody can read it through the website.
create table if not exists public.live_settings (
  id         int primary key default 1 check (id = 1),
  scorer_key text not null check (char_length(scorer_key) >= 24)
);

insert into public.live_settings (id, scorer_key)
values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- 3. Access rules. Everyone may READ the scores. Nobody may write to the tables directly;
--    changes go through live_save() below, which needs the key.
alter table public.live_matches enable row level security;
alter table public.live_settings enable row level security;   -- no policy on purpose: the key can never be read through the API

drop policy if exists "Anyone can read live scores" on public.live_matches;
create policy "Anyone can read live scores"
  on public.live_matches for select
  using (true);

-- Clean up the first version of this setup (accounts and a scorers list), if it was ever run.
drop policy if exists "Scorers can add matches" on public.live_matches;
drop policy if exists "Scorers can change matches" on public.live_matches;
drop function if exists public.is_scorer();
drop table if exists public.scorers;

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

-- 4. The two things the scoring page may do.
--    live_check_key: "is this key right?" (so the page can say so)
--    live_save:      write a match's state, only with the right key
create or replace function public.live_check_key(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.live_settings where id = 1 and scorer_key = p_key);
$$;

create or replace function public.live_save(
  p_key text,
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
set search_path = public
as $$
begin
  if not public.live_check_key(p_key) then
    raise exception 'wrong scoring key' using errcode = '42501';
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

create or replace function public.live_save_squads(p_key text, p_sport text, p_squads jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.live_check_key(p_key) then
    raise exception 'wrong scoring key' using errcode = '42501';
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

-- 8. Get the private scoring key (run this line on its own, whenever you need it):
--
--    select scorer_key from public.live_settings;
--
--    The scoring link is:  https://YOUR-SITE/admin/score#key=THE_KEY
--    Send it only to the people who will score. To switch the old link off, make a new key:
--
--    update public.live_settings set scorer_key = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') where id = 1;
