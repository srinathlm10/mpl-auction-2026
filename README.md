# MPL – Management Premiere League Auction Site

A single public, mobile-first website for the MPL player auction (Cricket, Volleyball, Football).
**Next.js 15 + Tailwind CSS.** No logins, no admin area, no database – all details live in three small data files and the site is built as plain static pages.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Where to enter / change details

Everything is in `src/data/`. Edit, save, and the page updates (locally) or redeploys (on Vercel after you push).

| File | What it holds |
|------|---------------|
| `players.json` | every player |
| `teams.json`   | every team (captain, total purse, logo) |
| `sports.json`  | the sports (name + url slug) |

### Add a player (`players.json`)

```json
{
  "id": 31,
  "name": "Full Name",
  "sport_id": 1,
  "batch": "2025-27",
  "role_or_position": "Batsman",
  "skills": { "batting": 8, "bowling": 5, "fielding": 7, "fitness": 6 },
  "photo_url": "/players/full-name.jpg",
  "base_price": 50000,
  "status": "available",
  "team_id": null,
  "sold_price": null
}
```

- `id` must be unique. `sport_id` is the sport's id from `sports.json` (1 Cricket, 2 Volleyball, 3 Football).
- `skills` keys per sport: Cricket `batting, bowling, fielding, fitness` · Volleyball `attack, block, serve, defense` · Football `pace, shooting, passing, defending` (ratings 1–10; skip any you don't want to show).
- `photo_url`: put the image in `public/players/` and write `"/players/file-name.jpg"`. Use `null` to show the initials placeholder. Portrait photos (4:5) look best.

### Mark a player sold / unsold

Change these fields on the player:

```json
"status": "sold", "team_id": 2, "sold_price": 80000
```
or `"status": "unsold", "team_id": null, "sold_price": null`.

The team's **remaining purse is calculated automatically** (total purse minus what its sold players cost), so you never edit it.

### Add a team (`teams.json`)

```json
{ "id": 13, "name": "Team Name", "sport_id": 1, "logo_url": "/teams/team-name.png", "captain": "Captain Name", "total_purse": 1000000 }
```
Logos go in `public/teams/`; `null` shows initials.

## Other things to personalise

- `src/lib/site.ts` – league name, auction date, contact email/phone, currency symbol (the date and contacts can also be set with `NEXT_PUBLIC_*` variables, see `.env.example`).
- `src/lib/content.ts` – About text, league rules, auction rules.
- `public/logo.svg` – the MPL logo.
- Colours: `src/app/globals.css` (`--primary` brand colour) and the per-sport accent in `src/lib/sports.ts`.

## Add a new sport

1. Add it to `src/data/sports.json` (`{ "id": 4, "name": "Badminton", "slug": "badminton" }`).
2. Add an entry in `SPORT_CONFIGS` in `src/lib/sports.ts` with the same `slug`: emoji, accent colour, roles/positions and skill names. (Without it the sport still works with a default colour and no skill bars.)
3. Add its teams and players. The nav, home card, sport page and teams page pick it up automatically.

## Deploy (Vercel)

1. Push to GitHub.
2. Vercel → **Add New → Project** → import the repo. No settings or environment variables are required.
3. Deploy. Every push to `main` redeploys automatically (about a minute).

## Structure

```
src/
  data/        players.json, teams.json, sports.json   <- your data
  app/(site)/  pages: home, sports/[sport], players/[id], teams, about
  components/  PlayerCard, TeamCard, SportTabs, FilterBar, PlayerExplorer, SportCard, ui/*
  lib/         data.ts (reads the JSON), sports.ts, site.ts, content.ts, format.ts
public/        logo.svg, players/ (photos), teams/ (logos)
```
