# MPL: Management Premier League Auction Site

Mobile-first website for the MPL player auction (Cricket, Volleyball, Football), with a **live auction**: spin wheel, bidding, SOLD alerts, and a projector screen that mirrors the auctioneer.

**Next.js 15 + Tailwind CSS, fully static.** Anyone can read the whole site without logging in. One admin login, checked by a small Supabase database, updates the scores and opens the admin pages. Player and team details are written in code (`src/data/*.json`).

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

## The auction is complete

The finished auction is in `src/data/auction-results.json`: every sale, captain and foreign player, by player id. Anyone on the list without an entry shows as Unsold. Captains' names are in `src/data/teams.json`. Every visitor sees exactly this, whatever is saved in their browser. Edit those files and push to change a result.

Visitors who open `/auction` are told the auction is over and sent to the Teams page. The auction screens below open only for the signed-in admin.

## How the auction is saved

- Results, bids and settings are saved in the **browser that runs `/auction`** (localStorage), signed in as the admin. A refresh, or closing and reopening the browser, keeps everything. Nothing saved there reaches other people.
- **Projector:** open `/auction/screen` in **another window of the same browser on the same laptop** and drag it to the projector. It follows the control screen live. (A different laptop or phone does not see the auction.)
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
- **Squad size per sport**: 12 Cricket, 8 Volleyball, 7 Football, used only while an auction is running.
- **Bid increment slabs**: only used when a bid is placed without an amount; on the auction screen every bid is set with − / + or typed in.

Change in code (`src/data/teams.json`): team names, captains, logos and purse.

**Rules the auction enforces** (`src/lib/local-auction.ts`): a team can bid only if, after paying, its remaining purse still covers the rest of its squad at base price; full squads can't bid; a team can't outbid itself; the opening bid is at least the base price and every later bid is higher than the current one.

## Screens

| URL | Who | What |
|-----|-----|------|
| `/auction` | Admin (everyone else sees "The auction is complete") | Pick a sport, wheel in the middle and the 4 teams in the corners; Spin, Start Bidding, bid amount −/+, Bid buttons on each team, Undo / Sold / Unsold, bring back unsold |
| `/auction/screen` | Admin's projector (same browser) | View-only copy: same live state, SOLD alerts, sound, full screen |
| `/admin/auction/settings` | Admin | Base price, squad sizes, backup / restore / reset |
| `/points-table` | Anyone | Football and volleyball standings and every match score, updated live |
| `/auction/summary` | Anyone | Sold players, captains and foreign players, unsold players, totals, CSV download |
| `/teams/<id>` | Anyone | One team's captain, squad, spent and remaining purse |

## Live scores (football and volleyball)

Everyone sees **the same live score on any phone, with no login and no sign-up**. One scorer signs in with an ID and a password and taps goals and points on their phone; the pages for everyone else update by themselves within a second.

- **`/live`**: every match (Live now, Up next, Results). **`/live/football-1`** (and so on): one match, with a link you can send in WhatsApp.
- **Football** looks like a score card on Google: team crests, the score, a **running match clock** (`34'`, then `20+2'` in stoppage time, `HT`, `FT`), the goal scorers under each team and a timeline with every goal and card. Halves are 20 minutes with a 5-minute break: change `halfMinutes` in `src/lib/live.ts`, or add `"half_minutes": 25` to a match in `src/data/fixtures.json`.
- **Volleyball** shows sets won, the set in play and every finished set. League matches are best of 3 sets to 15; the final is best of 3 sets to 25; win a set by 2. Change `RULES.volleyball` in `src/lib/live.ts`.
- **Goal animation and sounds**: when a goal arrives, a "GOAL!" banner drops in with the scorer, the minute and the new score, with confetti and a glow on the scoreboard. Sounds (whistles for kick-off, half time and full time, a goal horn with a crowd roar, a card sound, volleyball point and set sounds) are made in the browser and are **on unless someone switches them off with the "Sound" button**. Browsers hold all sound back until the first tap on the page, so the button says **Tap for sound** until then.
- The home page shows a **Live scores** strip while a match is being played, and nothing otherwise.

### Setting it up (once, about 5 minutes)

Live scores need a free [Supabase](https://supabase.com) project, because every phone has to read the same scores. Nothing else on the site needs it.

1. In Supabase open **SQL Editor → New query**, paste all of `supabase/live-scores.sql` and **Run**. It is safe to run again.
2. Put the project's URL and **publishable** key in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Netlify → Site configuration → Environment variables, and `.env.local` to try it on your computer), then **redeploy**: these values are built into the site, so a new deploy is needed after changing them (Netlify → Deploys → Trigger deploy). Never use the secret / service-role key. Until these are set, the menu has no "Live Scores" link and the live pages say scores are not switched on yet.
3. The scorer login is created by that SQL file: ID **`mplscorer`** and a generated password (given to the organiser separately; it is stored only as a hash, so it is not in this repository). To change the ID or password, run the statement at the end of `supabase/live-scores.sql`. Use a long password: the site is public.

### Scoring a match

1. Tap **Login** at the top of any page (it opens `/admin/score`) and sign in with the admin ID and password. The phone remembers the login until **Sign out** in the top bar is pressed, and the button then says **Admin**. There is no sign-up and no other account. Anyone can open `/admin/score` but cannot change a score: **the database checks the ID and password on every change and refuses anything else**.
2. Pick a match and tap **Kick off**: the clock starts for everyone. Tap **Goal** for a team the moment it happens (the minute is taken from the clock), then **pick the scorer from that team's players**. Yellow / red cards work the same way; **OG** is an own goal (it counts for the team you tap it under). ✎ edits a player or minute, ✕ deletes. **+1 min / −1 min** fixes a clock that was started late or early. Then **Half time**, **Start 2nd half**, **Full time**. **Undo** takes back the last thing you did, one step at a time, and says what it will undo: a goal or card, a clock change, or a tap on Kick off, Half time, Start 2nd half or Full time. Undoing a clock change never touches goals or cards.
3. Volleyball: tap **+1** for the team that won the rally. Sets and the match end by themselves; **Undo last point** fixes a mistake.
4. **Squads**: scorers choose goal scorers from each team's squad, which comes from the finished auction.
5. To lock someone out (for example after sharing the password too widely), change the password with the statement at the end of `supabase/live-scores.sql`: every phone that had the old one is signed out the next time it opens the page.

The matches (which teams play, in what order, optional start time) are in `src/data/fixtures.json`: by default every team plays every other team once in each sport. Add `"starts_at": "2026-11-14T16:00:00+05:30"` to show a start time.

Football has a league and a final. Every team plays the other three, the table on Live Scores updates when each match ends (3 points for a win, 1 for a draw, then goal difference, goals scored and head-to-head), and the top 2 go straight to the final (`football-7`). The final's teams fill in by themselves once all six league matches are finished, and the scorer can open it from then on. To choose the finalists by hand, put real team ids in place of `-1` and `-2` in `fixtures.json`. The points are in `RULES.football` in `src/lib/live.ts`.

Volleyball works the same way: every team plays the other three, and each league match is best of 3 sets to 15 (win a set by 2). A win earns 3 points, then set difference, point difference, points scored and head-to-head decide ties. The top 2 play the final (`volleyball-7`), best of 3 sets to 25. The rules are in `RULES.volleyball` in `src/lib/live.ts`.

Free-plan note: Supabase's free plan allows about 200 phones holding a live connection at the same time. Beyond that, extra phones automatically check for new scores every few seconds instead.

## Deploy (Netlify)

The site is deployed on Netlify from the `main` branch of the GitHub repo.

1. Push to GitHub. Every push to `main` redeploys by itself (and each pull request gets a preview). To set it up from scratch: Netlify → **Add new site → Import an existing project** → pick the repo; Netlify detects Next.js, so the defaults are fine.
2. The live scores and the admin login need the Supabase variables in `.env.example`; the contact details there are optional. They are read when the site is built, so after adding or changing one, redeploy.

## Structure

```
public/
  players/     player photos
  teams/       team logos
src/
  data/        players.json, teams.json, sports.json, fixtures.json, auction-results.json  (all the details, edit these)
  app/
    (site)/      public pages + auction/summary + teams/[id]
    (display)/   /auction (control) and /auction/screen (projector), admin only
    admin/       (panel) dashboard + settings
  components/
    auction/     AuctionStage, SpinWheel, BiddingPanel, BidAmountControl, PlayerSpotlight, TeamCorner, SoldOverlay, ...
    views/       the public pages, and AuctionComplete (what visitors see at /auction)
    admin/       AdminGate (the admin login), AdminNav, SettingsForm, ScoreConsole (the scorer's page)
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
