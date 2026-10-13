# MPL – Management Premiere League Auction Site

Mobile-first website for the MPL player auction (Cricket, Volleyball, Football), with a **live auction**: spin wheel, bidding, SOLD alerts, and a projector screen that mirrors the auctioneer in real time.

**Next.js 15 + Tailwind CSS + Supabase** (Postgres, Realtime). There are no logins.

## What runs where

| Part | Needs Supabase? |
|------|-----------------|
| Public pages (home, sports, players, teams, rules, results) | No – falls back to the JSON files in `src/data` |
| Live auction: `/admin/auction` (control) and `/auction` (projector) | **Yes** |

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Set up Supabase (needed for the live auction)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → **New query** → paste the whole of `supabase/setup-all.sql` → **Run**. That one file contains everything below, in the right order, and is safe to re-run. (Or run the three files separately, **in this order**:)
   1. `supabase/schema.sql` – tables, security, purse trigger
   2. `supabase/auction.sql` – auction settings, live state, bids log, auction actions, realtime
   3. `supabase/seed.sql` – the players and teams (112 players, 12 teams, ₹1 lakh base, ₹2 crore purse)
3. Copy `.env.example` to `.env.local`, fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API Keys; older projects can use `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and restart `npm run dev`.

> **No logins.** Anyone who opens `/admin/auction` can run the auction, and anyone with the site's public key could call the auction actions directly. The control screen is not linked from the public site – keep its URL to the organisers. The tables themselves are read-only from outside; data only changes through the auction actions in `auction.sql`.

## Test the live auction with the sample data

1. Open **two windows**: `http://localhost:3000/admin/auction` (the control screen) and `http://localhost:3000/auction` (the projector screen – press **Full screen + sound**).
2. Admin: choose **Cricket**. The projector switches to Cricket by itself.
3. Press **Spin** (or tap the wheel). Both screens spin and stop on the same player; the player card appears.
4. **Start Bidding**. Tap team buttons: the bid goes ₹1 L → ₹6 L → ₹11 L … (₹5 L steps below ₹50 L, ₹10 L steps up to ₹1 Cr, ₹25 L steps above). Try:
   - tapping the same team twice (blocked: already highest bidder),
   - **Undo last bid**,
   - pushing the bid near ₹1.9 Cr – in cricket (squads of 12) a team buying its first player must keep ₹11 L for the other 11, so its button greys out above ₹1.89 Cr with the reason.
5. **Sold** → full-screen SOLD alert on both screens, purse and squad update, player leaves the wheel.
6. Spin again, Start Bidding, and press **Unsold** without bidding → player leaves the wheel. **Bring back N unsold** puts them back for round two.
7. Refresh either window in the middle of bidding – it comes back exactly where it was.
8. See results at `/auction/summary` (with **Download CSV**) and each squad at `/teams/<id>`.
9. **Reset Cricket auction (testing)** at the bottom of the control screen restores everything for that sport.

> All three sports use the same 21 real players, topped up with placeholders ("Player 22", "Player 23" …) so every squad can be filled: Cricket 48 (4 × 12), Volleyball 32 (4 × 8), Football 32 (4 × 8). Every player uses the placeholder photo `public/players/placeholder.svg` until a real one is added: put the photo in `public/players/` and change that player's `photo_url`.

**Cricket has two wheels.** Tabs above the wheel switch between **Batsmen** (batsmen, wicketkeepers, fielders) and **Bowlers & all-rounders**; the projector follows. A player whose role is in neither list goes on the Batsmen wheel. The groups are `pools` in `src/lib/sports.ts`.

## Auction rules & settings

Change in **Settings** (`/admin/auction/settings`):

- **Base price** (default ₹1 lakh) – also updates every player who isn't sold yet.
- **Bid increment slabs** – any number of "while bid is below X, add Y" rows.
- **Squad size per sport** – 12 Cricket, 8 Volleyball, 8 Football.

Change in Supabase **Table Editor**:

- Team purse: `teams.total_purse` (default ₹2 crore). `remaining_purse` is calculated automatically.
- Number of teams: add or remove rows in `teams` (the bid buttons follow).
- Players: edit `players`, or edit `src/data/*.json` and run `npm run seed:generate` to rebuild `seed.sql` (re-running the seed wipes auction results).

**Rules the database enforces** (in `supabase/auction.sql`, one locked transaction per action): a team can bid only if, after paying, its remaining purse still covers the rest of its squad at base price; full squads can't bid; a team can't outbid itself; a double-tap can't place two bids; selling updates the player and team purse together.

## Screens

| URL | Who | What |
|-----|-----|------|
| `/admin/auction` | Auctioneer (no login, unlinked) | Sport picker, wheel, Spin, Start Bidding, team bid buttons, Undo / Sold / Unsold, bring back unsold |
| `/auction` | Anyone | Projector view of the same live state, SOLD alerts, sound, full screen |
| `/admin/auction/settings` | Auctioneer | Base price, increments, squad sizes |
| `/auction/summary` | Anyone | Sold and unsold lists, totals, CSV download |
| `/teams/<id>` | Anyone | One team's squad, spent and remaining purse |

## Deploy (Vercel)

1. Push to GitHub, then Vercel → **Add New → Project** → import the repo.
2. Add the environment variables from `.env.local`.
3. Deploy. Every push to `main` redeploys.

## Structure

```
supabase/      schema.sql, auction.sql (live auction migration), seed.sql
scripts/       generate-seed.mjs  (src/data/*.json -> supabase/seed.sql)
src/
  data/        players.json, teams.json, sports.json (sample data / no-database fallback)
  app/
    (site)/      public pages + auction/summary + teams/[id]
    (display)/auction/   projector screen
    admin/       (control)/auction, (panel) dashboard + settings, actions.ts
  components/
    auction/     AuctionStage, SpinWheel, BiddingPanel, PlayerReveal, TeamStrip, SoldOverlay, Confetti, SportSelector
    admin/       AdminNav, SettingsForm, SetupNotice
  lib/
    auction.ts   bid increment + affordability rules (mirrors the SQL)
    use-auction.ts  live snapshot hook (Realtime + fallback polling)
    random.ts    crypto.getRandomValues helpers for the wheel
    sound.ts     synthesised sounds + mute
    data.ts      public page data (Supabase, or JSON fallback)
    sports.ts    per-sport colours, roles, skills
```

## Adding a new sport

1. `insert into public.sports (name, slug, squad_size) values ('Badminton', 'badminton', 6);` (and add it to `src/data/sports.json` for the no-database fallback).
2. Add an entry to `SPORT_CONFIGS` in `src/lib/sports.ts` with the same `slug` (emoji, accent colour, roles, skill ratings, and text `attributes` such as cricket's *Bowling action*, which show on player cards and get their own filter).
3. Add its teams and players. The site and the auction pick it up automatically.
