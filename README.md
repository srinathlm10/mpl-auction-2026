# MPL: Management Premier League Auction Site

Mobile-first website for the MPL player auction (Cricket, Volleyball, Football), with a **live auction**: spin wheel, bidding, SOLD alerts, and a projector screen that mirrors the auctioneer.

**Next.js 15 + Tailwind CSS, fully static.** No logins and no environment variables needed. Player and team details are written in code (`src/data/*.json`), photos and logos sit in `public/`. The auction itself runs in the browser. The only optional extra is **live scores** for football and volleyball, which use a free Supabase project (see "Live scores" below).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Adding players and photos

Everything is in `src/data/`:

| File | What |
|------|------|
| `sports.json` | The sports (name, `slug`, `squad_size`) |
| `teams.json` | Teams per sport: `name`, `sport_id`, `logo_url`, `captain`, `total_purse` (in rupees, ₹2 crore = `20000000`) |
| `players.json` | Every player |

One player looks like this (only `id`, `name` and `sport_id` are required):

```json
{
  "id": 113,
  "name": "Rahul Sharma",
  "sport_id": 1,
  "batch": "2025-27",
  "role_or_position": "Bowler",
  "attributes": { "bowling_action": "Round arm" },
  "photo_url": "/players/rahul_sharma.jpg"
}
```

- **`id`** must be unique across the whole file (it is also the player page address, `/players/113`).
- **`sport_id`**: 1 Cricket, 2 Volleyball, 3 Football (see `sports.json`).
- **`role_or_position`**: for cricket use Batsman, Bowler, All-rounder, Wicketkeeper or Fielder (this decides the wheel, see below). Volleyball and football positions are listed in `src/lib/sports.ts`.
- **Photos**: upload the file to `public/players/` named after the player, in any reasonable form: `Harsh Pande.jpg`, `harsh_pande (1).jpeg`, `IMG-harsh-pande.png`, or just a first name when it is unique (`aryaman.jpg`). Every build matches the files to players by name (`scripts/match-photos.mjs`); run `npm run photos` to see which files matched, which players still have no photo, and which files could not be matched (ambiguous names like `kumar.jpg`, or iPhone `.heic` files, which browsers cannot show: save those as `.jpg`). A `photo_url` in `players.json` still wins when that file exists. Players without a photo show their initials. Portrait photos look best; the top of the photo is kept when it is cropped.
- **Hiding a player**: add `"hidden": true` to their entries in `players.json`. They stay in the file but are left out of the site and the auction completely. Remove the line to bring them back.
- **Team logos** go in `public/teams/` the same way.

Then commit and push; the site rebuilds with the new players.

## How the auction is saved

- Results, bids and settings are saved in the **browser that runs `/auction`** (localStorage). A refresh, or closing and reopening the browser, keeps everything.
- **Projector:** open `/auction/screen` in **another window of the same browser on the same laptop** and drag it to the projector. It follows the control screen live. (A different laptop or phone does not see the auction.)
- The public pages (Teams, Results, player pages) also show the results, in that same browser.
- **Back up** during breaks: Admin → Settings → **Download backup**. **Restore from backup** loads it on any laptop. **Reset whole auction** starts over.
- Don't run the auction in a private / incognito window: it forgets everything when closed.

## Test the live auction

1. Open **two windows**: `http://localhost:3000/auction` (runs the auction) and `http://localhost:3000/auction/screen` (the projector screen: press **Full screen + sound**).
2. Choose **Cricket**. The projector switches to Cricket by itself.
3. Press **Spin** (or tap the wheel). Both screens spin for about 1 second and stop on the same player; the player card appears. (The spin time is `SPIN_MS` in `src/components/auction/SpinWheel.tsx`.)
4. **Start Bidding**. Set the amount with **−** / **+** (₹1 lakh steps) or type the full bid in lakh, then tap a team's **Bid** button. The first bid can be the base price; every later bid must be higher than the current one. Try:
   - tapping the same team twice (blocked: already highest bidder),
   - **Undo last bid**,
   - pushing the bid near ₹1.9 Cr: in cricket (squads of 12) a team buying its first player must keep ₹11 L for the other 11, so its button greys out above ₹1.89 Cr with the reason.
5. **Sold** → full-screen SOLD alert on both screens, purse and squad update, player leaves the wheel.
6. Spin again, Start Bidding, and press **Unsold** without bidding → player leaves the wheel. **Bring back N unsold** puts them back for round two.
7. See results at `/auction/summary` (with **Download CSV**) and each squad at `/teams/<id>`.
8. **Reset Cricket auction (testing)** at the bottom of the control screen clears that sport.

**Cricket has two wheels.** After choosing Cricket you pick the **Batsmen** wheel (batsmen, wicketkeepers, fielders) or the **Bowlers** wheel (bowlers, all-rounders); each has its own colours. **Switch wheel** goes back to the choice between players, and when one wheel is empty there is a button to go to the other. A player whose role is in neither list goes on the Batsmen wheel. The wheels are `pools` in `src/lib/sports.ts`.

**Keyboard shortcuts** (on `/auction`): **Space** spin / start bidding · **1–4** bid for that corner's team · **+ / −** change the bid amount by ₹1 lakh · **U** undo (last bid, or the last Sold/Unsold) · **S** sold · **N** unsold.

**When the wheel stops** a full-screen card shows the player (photo left; sport, role/position, playing style, batch on the right). From there either **assign the player straight to a team** (enter the price, it starts at the base price, and tap the team) or **Start Bidding**, or **Skip** (unsold). Assigning follows the same purse and squad rules as bidding.

**Mistakes:** *Undo last bid* during bidding, and *Undo sale / Undo unsold* after a result (until the next spin) puts the player back exactly where they were and refunds the purse.

## Sound

Sounds are made in the browser (Web Audio), so there are no audio files – they play through whatever speakers the device uses (laptop → HDMI/projector or a Bluetooth speaker).

- Browsers only allow sound after a click: on `/auction` the first button you press turns it on; on `/auction/screen` press **Full screen + sound**. You hear a short test chime when sound switches on.
- **🔊 Sound / 🔇 Muted** in the auction bar mutes that screen. If both screens are in the same room, keep sound on only one of them to avoid an echo.
- What you hear: ticks while the wheel spins, a chime when it stops, a blip for every bid, a fanfare and cheer on SOLD, a low tone on unsold.

## Auction rules & settings

Change in **Settings** (`/admin/auction/settings`), saved in the auction browser:

- **Base price** (default ₹1 lakh): the opening bid for every player.
- **Squad size per sport**: 12 Cricket, 8 Volleyball, 7 Football.
- **Bid increment slabs**: only used when a bid is placed without an amount; on the auction screen every bid is set with − / + or typed in.

Change in code (`src/data/teams.json`): team names, captains, logos and purse.

**Rules the auction enforces** (`src/lib/local-auction.ts`): a team can bid only if, after paying, its remaining purse still covers the rest of its squad at base price; full squads can't bid; a team can't outbid itself; the opening bid is at least the base price and every later bid is higher than the current one.

## Screens

| URL | Who | What |
|-----|-----|------|
| `/auction` | Auctioneer (no login) | Pick a sport, wheel in the middle and the 4 teams in the corners; Spin, Start Bidding, bid amount −/+, Bid buttons on each team, Undo / Sold / Unsold, bring back unsold |
| `/auction/screen` | Projector (same browser) | View-only copy: same live state, SOLD alerts, sound, full screen |
| `/admin/auction/settings` | Auctioneer | Base price, squad sizes, backup / restore / reset |
| `/auction/summary` | Anyone | Sold and unsold lists, totals, CSV download |
| `/teams/<id>` | Anyone | One team's squad, spent and remaining purse |

## Live scores (football and volleyball)

Everyone sees **the same live score on any phone, with no login and no sign-up**. A scorer taps goals and points on their phone; the pages for everyone else update by themselves within a second.

- **`/live`**: every match (Live now, Up next, Results). **`/live/football-1`** (and so on): one match, with a link you can send in WhatsApp.
- **Football** looks like a score card on Google: team crests, the score, a **running match clock** (`34'`, then `20+2'` in stoppage time, `HT`, `FT`), the goal scorers under each team and a timeline with every goal and card. Halves are 20 minutes: change `halfMinutes` in `src/lib/live.ts`, or add `"half_minutes": 25` to a match in `src/data/fixtures.json`.
- **Volleyball** shows sets won, the set in play and every finished set. Best of 3 sets, 25 points (15 in a deciding set), win by 2: change `RULES.volleyball` in `src/lib/live.ts`.
- **Goal animation and sounds**: when a goal arrives, a "GOAL!" banner drops in with the scorer, the minute and the new score, with confetti and a glow on the scoreboard. Sounds (whistles for kick-off, half time and full time, a goal horn with a crowd roar, a card sound, volleyball point and set sounds) are made in the browser and are **off until someone taps the "Sound" button**.
- The home page shows a **Live scores** strip while a match is being played, and nothing otherwise.

### Setting it up (once, about 5 minutes)

Live scores need a free [Supabase](https://supabase.com) project, because every phone has to read the same scores. Nothing else on the site needs it.

1. In Supabase open **SQL Editor → New query**, paste all of `supabase/live-scores.sql` and **Run**. It is safe to run again.
2. Put the project's URL and **publishable** key in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Netlify → Site configuration → Environment variables, and `.env.local` to try it on your computer), then **redeploy**: these values are built into the site, so a new deploy is needed after changing them (Netlify → Deploys → Trigger deploy). Never use the secret / service-role key. Until these are set, the menu has no "Live Scores" link and the live pages say scores are not switched on yet.
3. Get the private scoring key: run `select scorer_key from public.live_settings;` in the SQL Editor. The **scoring link** is `https://YOUR-SITE/admin/score#key=THE_KEY`.

### Scoring a match

1. Send the scoring link, privately, to whoever will score. Opening it once on a phone saves the key in that phone and removes it from the address bar; after that `/admin/score` just works there. There is nothing to sign in to. Anyone without the link can open `/admin/score` but cannot change a score: **the database refuses every change that does not carry the key**.
2. Pick a match and tap **Kick off**: the clock starts for everyone. Tap **Goal** for a team the moment it happens (the minute is taken from the clock), then **pick the scorer from that team's players**. Yellow / red cards work the same way; **OG** is an own goal (it counts for the team you tap it under). ✎ edits a player or minute, ✕ deletes, **Undo last** takes back the last one. **+1 min / −1 min** fixes a clock that was started late or early. Then **Half time**, **Start 2nd half**, **Full time**.
3. Volleyball: tap **+1** for the team that won the rally. Sets and the match end by themselves; **Undo last point** fixes a mistake.
4. **Squads**: after the auction, open `/admin/score` (with the scoring link) on the laptop that ran it and tap **Publish squads**. Scorers then choose goal scorers from each team's squad. Before that they choose from all the players of the sport. The clock uses the database's time, so a phone with a wrong clock still shows the right minute.
5. To switch an old scoring link off, make a new key (the last lines of `supabase/live-scores.sql` show how).

The matches (which teams play, in what order, optional start time) are in `src/data/fixtures.json`: by default every team plays every other team once in each sport. Add `"starts_at": "2026-11-14T16:00:00+05:30"` to show a start time.

Free-plan note: Supabase's free plan allows about 200 phones holding a live connection at the same time. Beyond that, extra phones automatically check for new scores every few seconds instead.

## Deploy (Netlify)

The site is deployed on Netlify from the `main` branch of the GitHub repo.

1. Push to GitHub. Every push to `main` redeploys by itself (and each pull request gets a preview). To set it up from scratch: Netlify → **Add new site → Import an existing project** → pick the repo; Netlify detects Next.js, so the defaults are fine.
2. No environment variables are needed (the optional ones in `.env.example` set the auction date, contact details and the live-scores database). They are read when the site is built, so after adding or changing one, trigger a new deploy.

## Structure

```
public/
  players/     player photos
  teams/       team logos
src/
  data/        players.json, teams.json, sports.json, fixtures.json  (all the details, edit these)
  app/
    (site)/      public pages + auction/summary + teams/[id]
    (display)/   /auction (control) and /auction/screen (projector)
    admin/       (panel) dashboard + settings
  components/
    auction/     AuctionStage, SpinWheel, BiddingPanel, BidAmountControl, PlayerSpotlight, TeamCorner, SoldOverlay, ...
    views/       client views of the public pages (they add the auction results)
    admin/       AdminNav, SettingsForm, ScoreConsole (the scorer's page)
    live/        match cards, goal banner, sound button
  lib/
    data.ts           reads src/data/*.json
    local-auction.ts  the auction: actions, rules, saving in the browser, live sync between windows
    auction.ts        bid amount + affordability rules
    use-auction.ts    hooks for the screens and pages
    random.ts         crypto.getRandomValues helpers for the wheel
    sound.ts          synthesised sounds + mute (auction sounds and the live-score whistles / goal horn)
    live.ts           live scores: rules, match clock, volleyball sets (pure, no network)
    live-store.ts     the shared connection to Supabase (live push, polling, saving)
    use-live.ts, use-live-sound.ts, use-scorer.ts, use-now.ts   hooks for the live pages and the scoring page
    sports.ts         per-sport colours, roles, skills, wheels
```

## Adding a new sport

1. Add it to `src/data/sports.json` (new `id`, `name`, `slug`, `squad_size`).
2. Add an entry to `SPORT_CONFIGS` in `src/lib/sports.ts` with the same `slug` (emoji, accent colour, roles, skill ratings, and text `attributes` such as cricket's *Bowling action*, which show on player cards and get their own filter).
3. Add its teams and players. The site and the auction pick it up automatically.
