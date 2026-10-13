# MPL – Management Premiere League Auction Site

Mobile-first website for the MPL player auction (Cricket, Volleyball, Football).
Built with **Next.js 15 (App Router) + Tailwind CSS + Supabase**. This is the foundation step – the live bidding system is not built yet, but the schema and code are ready for it.

## Quick start (no setup needed)

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Supabase keys, the site runs on **built-in sample data** (30 players, 12 teams) in read-only mode. The admin area shows a setup notice.

## Connect Supabase (for the admin area and real data)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `supabase/schema.sql`, then `supabase/seed.sql` (sample data – optional, skip it for a clean start).
3. **Authentication → Users** → *Add user* (email + password). Then **Authentication → Providers → Email** → turn off "Allow new users to sign up".
4. In the SQL editor, make that user an admin:
   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```
5. Copy `.env.example` to `.env.local` and fill in **Project Settings → API**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Set `NEXT_PUBLIC_AUCTION_DATE` too.
6. Restart `npm run dev` and open `/admin`.

Only emails in the `admins` table can write data (enforced by Row Level Security, not just the UI). Photos and logos are stored in the public `mpl-media` storage bucket, created by `schema.sql`.

## Deploy to Vercel

1. Push the project to GitHub.
2. In Vercel: **Add New → Project** → import the repo (framework: Next.js, no changes needed).
3. Add the environment variables from `.env.local` to the Vercel project settings.
4. Deploy. Public pages are cached and refresh every 60 seconds; admin changes show up immediately.

## Project structure

```
supabase/            schema.sql (tables, RLS, storage, purse trigger), seed.sql (sample data)
scripts/             generate-seed.mjs  -> rebuilds seed.sql from src/data/sample-data.json
public/              logo.svg, sample-players.csv (CSV import template)
src/
  middleware.ts      refreshes the session and guards /admin/*
  app/
    (site)/          public pages: home, sports/[sport], players/[id], teams, about
    admin/           login + (panel)/ dashboard, players, teams, import; actions.ts = server actions
  components/        PlayerCard, TeamCard, SportTabs, FilterBar, PlayerExplorer, SportCard, ...
    admin/           PlayerForm, TeamForm, CsvImporter, ImageField, DeleteButton, AdminNav
    ui/              StatusBadge, PlayerAvatar, SkillBar, StatCard, ThemeToggle, Logo, ...
  lib/
    sports.ts        per-sport config: accent colour, roles, skill ratings  <- edit to add sports
    site.ts          league name, auction date, contact, currency
    content.ts       About / rules text
    data.ts          all reads (Supabase, or sample data when not configured)
    validation.ts, csv.ts   shared form and CSV parsing
    supabase/        public (cached reads), server (admin session), env
  data/sample-data.json     the sample data used when Supabase is not configured
```

## CSV import

Admin → **Import CSV**. Columns: `name, sport, batch, role_or_position, base_price` (required), `photo_url` and `skill_<key>` columns such as `skill_batting` (optional). `sport` is the name or slug. Download `/sample-players.csv` as a template. Rows with problems are listed and skipped; the rest import as *Available*.

## Adding a new sport later

1. **Database** – add a row: `insert into public.sports (name, slug) values ('Badminton', 'badminton');`
2. **Look & skills** – add an entry to `SPORT_CONFIGS` in `src/lib/sports.ts` with the same `slug`: emoji, accent colour (`"R G B"`), roles/positions, and skill ratings.
3. Done. The nav, home card, sport page, teams page, admin forms and CSV import pick it up automatically. (Without step 2 the sport still works, using a default colour, a free-text role and no skill bars.)

## Theming

Colours are CSS variables in `src/app/globals.css` (`--primary` for the brand, `--accent` re-pointed per sport via `accentStyle()`). Dark/light follows the device setting and the toggle in the header remembers the choice.

## Design notes for the bidding step

- `players.status`, `team_id` and `sold_price` are what a winning bid should set; a database trigger keeps each team's `remaining_purse` correct automatically.
- `auctions` and `bids` table sketches are commented at the bottom of `schema.sql`.
- Supabase Realtime can be enabled on `players` / `teams` / `bids` for live updates.

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run typecheck` · `npm run seed:generate`
