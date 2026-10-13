-- MPL Auction – database schema
-- Run this whole file once in Supabase -> SQL Editor.
-- It is safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.sports (
  id    bigint generated always as identity primary key,
  name  text not null unique,
  slug  text not null unique          -- used in URLs, e.g. "cricket"
);

create table if not exists public.teams (
  id               bigint generated always as identity primary key,
  name             text   not null,
  sport_id         bigint not null references public.sports(id) on delete restrict,
  logo_url         text,
  captain          text   not null default '',
  total_purse      bigint not null default 0 check (total_purse >= 0),
  remaining_purse  bigint not null default 0,   -- kept in sync by trigger below
  created_at       timestamptz not null default now(),
  unique (sport_id, name)
);

create table if not exists public.players (
  id                bigint generated always as identity primary key,
  name              text   not null,
  sport_id          bigint not null references public.sports(id) on delete restrict,
  batch             text   not null default '',
  role_or_position  text   not null default '',
  skills            jsonb  not null default '{}'::jsonb,   -- differs per sport, e.g. {"batting":8,"bowling":5}
  photo_url         text,
  base_price        bigint not null default 0 check (base_price >= 0),
  status            text   not null default 'available' check (status in ('available', 'sold', 'unsold')),
  team_id           bigint references public.teams(id) on delete set null,
  sold_price        bigint check (sold_price >= 0),
  created_at        timestamptz not null default now()
);

create index if not exists players_sport_idx  on public.players (sport_id);
create index if not exists players_status_idx on public.players (status);
create index if not exists players_team_idx   on public.players (team_id);
create index if not exists teams_sport_idx    on public.teams (sport_id);

-- ---------------------------------------------------------------------------
-- Keep teams.remaining_purse = total_purse - sum(sold_price of its sold players)
-- (also means a future bidding feature only has to mark a player as sold)
-- ---------------------------------------------------------------------------

create or replace function public.set_team_remaining_purse()
returns trigger language plpgsql as $$
begin
  new.remaining_purse := new.total_purse - coalesce((
    select sum(p.sold_price) from public.players p
    where p.team_id = new.id and p.status = 'sold'
  ), 0);
  return new;
end $$;

drop trigger if exists teams_remaining_purse on public.teams;
create trigger teams_remaining_purse
  before insert or update on public.teams
  for each row execute function public.set_team_remaining_purse();

create or replace function public.refresh_team_purses()
returns trigger language plpgsql as $$
begin
  -- Touching the team row re-runs the trigger above.
  if tg_op in ('UPDATE', 'DELETE') and old.team_id is not null then
    update public.teams set total_purse = total_purse where id = old.team_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.team_id is not null then
    update public.teams set total_purse = total_purse where id = new.team_id;
  end if;
  return null;
end $$;

drop trigger if exists players_refresh_purses on public.players;
create trigger players_refresh_purses
  after insert or update or delete on public.players
  for each row execute function public.refresh_team_purses();

-- ---------------------------------------------------------------------------
-- Admin allow-list + Row Level Security
-- Anyone can READ sports/teams/players. Only emails listed in public.admins
-- can write. (Also disable public sign-ups in Supabase -> Authentication.)
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;   -- no policies: not readable via API

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.sports  enable row level security;
alter table public.teams   enable row level security;
alter table public.players enable row level security;

drop policy if exists "public read sports"  on public.sports;
drop policy if exists "public read teams"   on public.teams;
drop policy if exists "public read players" on public.players;
create policy "public read sports"  on public.sports  for select using (true);
create policy "public read teams"   on public.teams   for select using (true);
create policy "public read players" on public.players for select using (true);

drop policy if exists "admin write sports"  on public.sports;
drop policy if exists "admin write teams"   on public.teams;
drop policy if exists "admin write players" on public.players;
create policy "admin write sports"  on public.sports  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write teams"   on public.teams   for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write players" on public.players for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Image storage (player photos + team logos)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('mpl-media', 'mpl-media', true)
on conflict (id) do nothing;

drop policy if exists "public read mpl-media"  on storage.objects;
drop policy if exists "admin insert mpl-media" on storage.objects;
drop policy if exists "admin update mpl-media" on storage.objects;
drop policy if exists "admin delete mpl-media" on storage.objects;
create policy "public read mpl-media"  on storage.objects for select using (bucket_id = 'mpl-media');
create policy "admin insert mpl-media" on storage.objects for insert with check (bucket_id = 'mpl-media' and public.is_admin());
create policy "admin update mpl-media" on storage.objects for update using (bucket_id = 'mpl-media' and public.is_admin());
create policy "admin delete mpl-media" on storage.objects for delete using (bucket_id = 'mpl-media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Reserved for the live bidding step (not used yet)
-- ---------------------------------------------------------------------------
-- create table public.auctions (
--   id          bigint generated always as identity primary key,
--   sport_id    bigint not null references public.sports(id),
--   status      text   not null default 'scheduled',   -- scheduled | live | completed
--   starts_at   timestamptz,
--   created_at  timestamptz not null default now()
-- );
-- create table public.bids (
--   id          bigint generated always as identity primary key,
--   auction_id  bigint not null references public.auctions(id) on delete cascade,
--   player_id   bigint not null references public.players(id)  on delete cascade,
--   team_id     bigint not null references public.teams(id)    on delete cascade,
--   amount      bigint not null check (amount > 0),
--   created_at  timestamptz not null default now()
-- );
