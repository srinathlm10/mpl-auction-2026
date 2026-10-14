# MPL: Management Premiere League Auction Site

Mobile-first website for the MPL player auction (Cricket, Volleyball, Football), with a **live auction**: spin wheel, bidding, SOLD alerts, and a projector screen that mirrors the auctioneer.

**Next.js 15 + Tailwind CSS, fully static.** No database, no logins, no environment variables needed. Player and team details are written in code (`src/data/*.json`), photos and logos sit in `public/`. The auction itself runs in the browser.

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
- **Squad size per sport**: 12 Cricket, 8 Volleyball, 8 Football.
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

## Deploy (Vercel)

1. Push to GitHub, then Vercel → **Add New → Project** → import the repo.
2. Deploy. Every push to `main` redeploys. No environment variables are needed (the optional ones in `.env.example` set the auction date and contact details).

## Structure

```
public/
  players/     player photos
  teams/       team logos
src/
  data/        players.json, teams.json, sports.json  (all the details, edit these)
  app/
    (site)/      public pages + auction/summary + teams/[id]
    (display)/   /auction (control) and /auction/screen (projector)
    admin/       (panel) dashboard + settings
  components/
    auction/     AuctionStage, SpinWheel, BiddingPanel, BidAmountControl, PlayerSpotlight, TeamCorner, SoldOverlay, ...
    views/       client views of the public pages (they add the auction results)
    admin/       AdminNav, SettingsForm
  lib/
    data.ts           reads src/data/*.json
    local-auction.ts  the auction: actions, rules, saving in the browser, live sync between windows
    auction.ts        bid amount + affordability rules
    use-auction.ts    hooks for the screens and pages
    random.ts         crypto.getRandomValues helpers for the wheel
    sound.ts          synthesised sounds + mute
    sports.ts         per-sport colours, roles, skills, wheels
```

## Adding a new sport

1. Add it to `src/data/sports.json` (new `id`, `name`, `slug`, `squad_size`).
2. Add an entry to `SPORT_CONFIGS` in `src/lib/sports.ts` with the same `slug` (emoji, accent colour, roles, skill ratings, and text `attributes` such as cricket's *Bowling action*, which show on player cards and get their own filter).
3. Add its teams and players. The site and the auction pick it up automatically.
