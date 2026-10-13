-- MPL Live Auction – migration
-- Run order in the Supabase SQL editor: 1) schema.sql  2) auction.sql (this file)  3) seed.sql
-- Safe to re-run.

do $$
begin
  if to_regclass('public.sports') is null or to_regclass('public.players') is null or to_regclass('public.teams') is null then
    raise exception 'Run supabase/schema.sql first, then this file (auction.sql), then seed.sql.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

alter table public.sports add column if not exists squad_size int not null default 11 check (squad_size > 0);
-- Defaults for an existing database: 8 for volleyball and football (cricket is set to 12 by seed.sql).
update public.sports set squad_size = 8 where slug in ('volleyball', 'football') and squad_size = 11;

create table if not exists public.auction_settings (
  id               int primary key default 1 check (id = 1),     -- single row
  base_price       bigint not null default 100000 check (base_price > 0),
  -- Ordered slabs: while the current bid is below "up_to" the next bid adds "step".
  -- The last slab has up_to = null (everything above).
  increment_slabs  jsonb  not null default '[
    {"up_to": 5000000,  "step": 500000},
    {"up_to": 10000000, "step": 1000000},
    {"up_to": null,     "step": 2500000}
  ]'::jsonb
);
insert into public.auction_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Live state (one row) and bid log
-- ---------------------------------------------------------------------------

create table if not exists public.auction_state (
  id                 int primary key default 1 check (id = 1),   -- single row
  sport_id           bigint references public.sports(id)  on delete set null,
  current_player_id  bigint references public.players(id) on delete set null,
  current_bid        bigint,
  highest_team_id    bigint references public.teams(id)   on delete set null,
  status             text not null default 'idle'
                     check (status in ('idle', 'spinning', 'bidding', 'sold', 'unsold')),
  spin_id            bigint not null default 0,    -- +1 on every spin so screens animate once
  updated_at         timestamptz not null default now()
);
insert into public.auction_state (id) values (1) on conflict (id) do nothing;

-- Which wheel is showing when a sport has more than one (cricket: 'batsmen' / 'bowlers').
-- Null = the sport's first wheel. The pools themselves are defined in src/lib/sports.ts.
alter table public.auction_state add column if not exists pool text;

create table if not exists public.bids (
  id          bigint generated always as identity primary key,
  player_id   bigint not null references public.players(id) on delete cascade,
  team_id     bigint not null references public.teams(id)   on delete cascade,
  amount      bigint not null check (amount > 0),
  created_at  timestamptz not null default now(),
  voided_at   timestamptz                                  -- set by "Undo last bid"
);
create index if not exists bids_player_idx on public.bids (player_id, id);

-- ---------------------------------------------------------------------------
-- Row Level Security: everyone can read. Nothing can be written directly;
-- settings, live state and bids change ONLY through the functions below.
-- ---------------------------------------------------------------------------

alter table public.auction_settings enable row level security;
alter table public.auction_state    enable row level security;
alter table public.bids             enable row level security;

drop policy if exists "public read auction_settings" on public.auction_settings;
drop policy if exists "public read auction_state"    on public.auction_state;
drop policy if exists "public read bids"             on public.bids;
drop policy if exists "admin write auction_settings" on public.auction_settings;  -- from the login version
create policy "public read auction_settings" on public.auction_settings for select using (true);
create policy "public read auction_state"    on public.auction_state    for select using (true);
create policy "public read bids"             on public.bids             for select using (true);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- No logins: the auction actions are open to anyone who can open the control screen.
drop function if exists public.auction_require_admin();

create or replace function public.auction_increment(p_current bigint)
returns bigint language plpgsql stable as $$
declare
  slab jsonb;
begin
  for slab in
    select value from jsonb_array_elements((select increment_slabs from public.auction_settings where id = 1))
  loop
    if (slab ->> 'up_to') is null or p_current < (slab ->> 'up_to')::bigint then
      return (slab ->> 'step')::bigint;
    end if;
  end loop;
  raise exception 'No increment slab matches a bid of %.', p_current;
end $$;

-- ---------------------------------------------------------------------------
-- Auction actions (all run as one transaction each, with the state row locked)
-- ---------------------------------------------------------------------------

-- Choose which sport is being auctioned.
create or replace function public.auction_set_sport(p_sport_id bigint)
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status in ('spinning', 'bidding') then
    raise exception 'Finish the current player before changing the sport.';
  end if;
  if not exists (select 1 from public.sports where id = p_sport_id) then
    raise exception 'Unknown sport.';
  end if;
  update public.auction_state
     set sport_id = p_sport_id, pool = null, current_player_id = null, current_bid = null,
         highest_team_id = null, status = 'idle', updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- Switch between a sport's wheels (e.g. cricket batsmen / bowlers).
create or replace function public.auction_set_pool(p_pool text)
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status in ('spinning', 'bidding') then
    raise exception 'Finish the current player before switching wheels.';
  end if;
  update public.auction_state
     set pool = nullif(trim(p_pool), ''), current_player_id = null, current_bid = null,
         highest_team_id = null, status = 'idle', updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- The wheel result. The winner is picked by the admin browser with
-- crypto.getRandomValues; this records it so every screen animates to the same player.
create or replace function public.auction_select_player(p_player_id bigint)
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state; pl public.players;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.sport_id is null then raise exception 'Choose a sport first.'; end if;
  if st.status in ('spinning', 'bidding') then raise exception 'A player is already on the block.'; end if;
  select * into pl from public.players
   where id = p_player_id and sport_id = st.sport_id and status = 'available';
  if not found then raise exception 'That player is not available in this sport.'; end if;
  update public.auction_state
     set current_player_id = pl.id, current_bid = null, highest_team_id = null,
         status = 'spinning', spin_id = spin_id + 1, updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

create or replace function public.auction_start_bidding()
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status <> 'spinning' then raise exception 'Spin the wheel first.'; end if;
  update public.auction_state
     set status = 'bidding', current_bid = public.auction_settings_base(), highest_team_id = null, updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

create or replace function public.auction_settings_base()
returns bigint language sql stable as $$
  select base_price from public.auction_settings where id = 1
$$;

-- Raise the bid on behalf of a team. p_expected is the bid amount the auctioneer set
-- (+/- 1 lakh or typed in): at least the base price to open, then above the current bid,
-- so a double tap is rejected instead of bidding twice. Without it the bid goes up by the
-- increment slab.
create or replace function public.auction_place_bid(p_team_id bigint, p_expected bigint default null)
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare
  st public.auction_state; tm public.teams;
  v_squad int; v_bought int; v_amount bigint; v_base bigint; v_reserve bigint;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status <> 'bidding' then raise exception 'Bidding is not open.'; end if;

  select * into tm from public.teams where id = p_team_id and sport_id = st.sport_id;
  if not found then raise exception 'That team does not play this sport.'; end if;
  if st.highest_team_id = tm.id then raise exception '% already holds the highest bid.', tm.name; end if;

  if p_expected is null then
    v_amount := st.current_bid + public.auction_increment(st.current_bid);
  else
    v_amount := p_expected;
    if st.highest_team_id is null then
      if v_amount < public.auction_settings_base() then
        raise exception 'The opening bid must be at least the base price.';
      end if;
    elsif v_amount <= st.current_bid then
      raise exception 'The bid has moved on: it must be higher than %. Please try again.', st.current_bid;
    end if;
  end if;

  select squad_size into v_squad from public.sports where id = st.sport_id;
  select count(*) into v_bought from public.players where team_id = tm.id and status = 'sold';
  if v_bought >= v_squad then raise exception '% already has a full squad.', tm.name; end if;

  -- After paying, the team must still afford the rest of its squad at base price.
  v_base := public.auction_settings_base();
  v_reserve := (v_squad - v_bought - 1) * v_base;
  if tm.remaining_purse - v_amount < v_reserve then
    raise exception '% cannot afford this bid: it must keep % for % more player(s).',
      tm.name, v_reserve, (v_squad - v_bought - 1);
  end if;

  insert into public.bids (player_id, team_id, amount) values (st.current_player_id, tm.id, v_amount);
  update public.auction_state
     set current_bid = v_amount, highest_team_id = tm.id, updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- Remove the latest bid (kept in the log, marked as voided).
create or replace function public.auction_undo_bid()
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state; last_bid public.bids; prev_bid public.bids;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status <> 'bidding' then raise exception 'Bidding is not open.'; end if;

  select * into last_bid from public.bids
   where player_id = st.current_player_id and voided_at is null order by id desc limit 1;
  if not found then raise exception 'There is no bid to undo.'; end if;
  update public.bids set voided_at = now() where id = last_bid.id;

  select * into prev_bid from public.bids
   where player_id = st.current_player_id and voided_at is null order by id desc limit 1;
  update public.auction_state
     set current_bid = coalesce(prev_bid.amount, public.auction_settings_base()),
         highest_team_id = prev_bid.team_id, updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- Sell to the highest bidder. The players row and the team purse (via trigger)
-- change in this one transaction.
create or replace function public.auction_sold()
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status <> 'bidding' then raise exception 'Bidding is not open.'; end if;
  if st.highest_team_id is null then raise exception 'Nobody has bid yet. Use Unsold instead.'; end if;

  update public.players
     set status = 'sold', team_id = st.highest_team_id, sold_price = st.current_bid
   where id = st.current_player_id;

  update public.auction_state set status = 'sold', updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- No bids: take the player off the wheel.
create or replace function public.auction_unsold()
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status not in ('spinning', 'bidding') then raise exception 'No player is on the block.'; end if;
  if exists (select 1 from public.bids where player_id = st.current_player_id and voided_at is null) then
    raise exception 'Bids have been placed. Undo them, or sell the player.';
  end if;

  update public.players set status = 'unsold' where id = st.current_player_id;
  update public.auction_state
     set status = 'unsold', current_bid = null, highest_team_id = null, updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- Put the player on the block straight into a team, from the player pop-up.
-- p_price: what the team pays (default: the current bid while bidding, else the base price).
-- Same rules as bidding: the right sport, squad not full, and the team must still
-- afford the rest of its squad at base price. Undo with auction_undo_result().
create or replace function public.auction_assign(p_team_id bigint, p_price bigint default null)
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare
  st public.auction_state; tm public.teams;
  v_squad int; v_bought int; v_base bigint; v_price bigint; v_reserve bigint;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status not in ('spinning', 'bidding') then raise exception 'No player is on the block.'; end if;

  select * into tm from public.teams where id = p_team_id and sport_id = st.sport_id;
  if not found then raise exception 'That team does not play this sport.'; end if;

  v_base := public.auction_settings_base();
  v_price := coalesce(p_price, case when st.status = 'bidding' then st.current_bid end, v_base);
  if v_price < v_base then raise exception 'The price cannot be below the base price.'; end if;

  select squad_size into v_squad from public.sports where id = st.sport_id;
  select count(*) into v_bought from public.players where team_id = tm.id and status = 'sold';
  if v_bought >= v_squad then raise exception '% already has a full squad.', tm.name; end if;

  v_reserve := (v_squad - v_bought - 1) * v_base;
  if tm.remaining_purse - v_price < v_reserve then
    raise exception '% cannot afford this price: it must keep % for % more player(s).',
      tm.name, v_reserve, (v_squad - v_bought - 1);
  end if;

  insert into public.bids (player_id, team_id, amount) values (st.current_player_id, tm.id, v_price);
  update public.players set status = 'sold', team_id = tm.id, sold_price = v_price where id = st.current_player_id;
  update public.auction_state
     set status = 'sold', current_bid = v_price, highest_team_id = tm.id, updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- Undo a mistaken Sold / Unsold for the player just auctioned (only until the next spin).
-- Sold   -> bidding again at the same price and leader; the team gets its money back.
-- Unsold -> back to the player card, before bidding.
create or replace function public.auction_undo_result()
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.status = 'sold' then
    update public.players set status = 'available', team_id = null, sold_price = null where id = st.current_player_id;
    update public.auction_state set status = 'bidding', updated_at = now() where id = 1 returning * into st;
  elsif st.status = 'unsold' then
    update public.players set status = 'available' where id = st.current_player_id;
    update public.auction_state set status = 'spinning', updated_at = now() where id = 1 returning * into st;
  else
    raise exception 'There is no result to undo.';
  end if;
  return st;
end $$;

-- Second round: unsold players go back on the wheel. Returns how many.
create or replace function public.auction_bring_back_unsold()
returns int language plpgsql security definer set search_path = public as $$
declare st public.auction_state; n int;
begin
  select * into st from public.auction_state where id = 1 for update;
  if st.sport_id is null then raise exception 'Choose a sport first.'; end if;
  update public.players set status = 'available' where sport_id = st.sport_id and status = 'unsold';
  get diagnostics n = row_count;
  update public.auction_state set updated_at = now() where id = 1;
  return n;
end $$;

-- Start over for one sport (handy for testing): everyone back to available,
-- bids cleared, purses restored.
create or replace function public.auction_reset_sport(p_sport_id bigint)
returns public.auction_state language plpgsql security definer set search_path = public as $$
declare st public.auction_state;
begin
  select * into st from public.auction_state where id = 1 for update;
  delete from public.bids where player_id in (select id from public.players where sport_id = p_sport_id);
  update public.players set status = 'available', team_id = null, sold_price = null where sport_id = p_sport_id;
  update public.teams set total_purse = total_purse where sport_id = p_sport_id;  -- recalculates purse
  update public.auction_state
     set sport_id = p_sport_id, pool = null, current_player_id = null, current_bid = null,
         highest_team_id = null, status = 'idle', updated_at = now()
   where id = 1 returning * into st;
  return st;
end $$;

-- Settings page: base price (also applied to unsold players), bid slabs, squad sizes.
create or replace function public.auction_save_settings(p_base_price bigint, p_slabs jsonb, p_squads jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; n int;
begin
  if p_base_price is null or p_base_price <= 0 then raise exception 'Base price must be a positive amount.'; end if;
  if jsonb_typeof(p_slabs) is distinct from 'array' or jsonb_array_length(p_slabs) = 0 then
    raise exception 'Add at least one bid increment slab.';
  end if;
  update public.auction_settings set base_price = p_base_price, increment_slabs = p_slabs where id = 1;
  for k, v in select key, value from jsonb_each(coalesce(p_squads, '{}'::jsonb)) loop
    n := (v #>> '{}')::int;
    if n < 1 or n > 50 then raise exception 'Squad size must be between 1 and 50.'; end if;
    update public.sports set squad_size = n where id = k::bigint;
  end loop;
  update public.players set base_price = p_base_price where status <> 'sold';
end $$;

-- No logins: anyone with the site (anon key) may call the actions.
do $$
declare f text;
begin
  foreach f in array array[
    'auction_set_sport(bigint)', 'auction_set_pool(text)', 'auction_select_player(bigint)', 'auction_start_bidding()',
    'auction_place_bid(bigint,bigint)', 'auction_undo_bid()', 'auction_sold()', 'auction_unsold()',
    'auction_bring_back_unsold()', 'auction_reset_sport(bigint)', 'auction_save_settings(bigint,jsonb,jsonb)',
    'auction_undo_result()', 'auction_assign(bigint,bigint)'
  ] loop
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime: lets the projector screen follow the admin screen live
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['auction_state', 'bids', 'players', 'teams'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
