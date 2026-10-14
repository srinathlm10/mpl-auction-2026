// Builds src/data/roster.json, the player list the site actually uses, from
// src/data/players.json:
//  - players marked "hidden": true are left out completely (not even shipped
//    to the browser), and
//  - photos in public/players are linked to players by FILE NAME, so they can
//    be uploaded with any sensible name ("Harsh Pande.jpg", "harsh_pande (1).jpeg",
//    "IMG_harsh-pande.png", "aryaman.jpg"...).
//
// Runs on every build and dev start (from next.config.mjs). To see the report:
//   npm run photos
//
// A player's own "photo_url" in players.json wins when that file exists. Files
// that match nobody, or more than one player, are listed and left unused.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const IMAGE = /\.(jpe?g|png|webp|avif|gif)$/i;
const UNSUPPORTED = /\.(heic|heif|tiff?|bmp)$/i;
// Words that often appear in photo file names but are not part of anyone's name.
const NOISE = new Set([
  "img", "image", "photo", "pic", "picture", "copy", "final", "edited", "edit", "dp", "profile", "passport",
  "size", "wa", "whatsapp", "new", "mba", "mpl", "cricket", "volleyball", "football", "player", "scaled", "crop", "cropped",
]);

const words = (s) =>
  s
    .toLowerCase()
    .replace(IMAGE, "")
    .replace(/[^a-z]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !NOISE.has(w));

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** How well a file name fits a player name: 3 exact, 2 every word matches, 1 close spelling, 0 no. */
function score(fileWords, nameWords) {
  if (fileWords.length === 0) return 0;
  const f = fileWords.join(""), n = nameWords.join("");
  if (f === n) return 3;
  if (fileWords.every((w) => nameWords.includes(w)) || nameWords.every((w) => fileWords.includes(w))) return 2;
  const similarity = 1 - distance(f, n) / Math.max(f.length, n.length);
  return similarity >= 0.82 ? 1 : 0;
}

export function matchPhotos(root = process.cwd(), { log = false } = {}) {
  const dir = path.join(root, "public/players");
  const players = JSON.parse(readFileSync(path.join(root, "src/data/players.json"), "utf8"));
  const names = [...new Set(players.map((p) => p.name))];
  const all = existsSync(dir) ? readdirSync(dir) : [];
  const files = all.filter((f) => IMAGE.test(f));
  const url = (file) => `/players/${encodeURIComponent(file)}`;

  const photos = {};
  // 1. An explicit photo_url that exists.
  for (const p of players) {
    const file = p.photo_url?.startsWith("/players/") ? decodeURIComponent(p.photo_url.slice("/players/".length)) : null;
    if (file && IMAGE.test(file) && files.includes(file) && !photos[p.name]) photos[p.name] = url(file);
  }

  // 2. Match the remaining files by name. Each file goes to its single best player.
  const claimed = new Set(Object.values(photos));
  const best = {}; // name -> { file, score }
  const unmatched = [];
  const ambiguous = [];
  const extra = []; // a second photo for someone who already has one
  for (const file of files) {
    if (claimed.has(url(file)) || file === "placeholder.svg") continue;
    const fw = words(file);
    let top = 0;
    let hits = [];
    for (const name of names) {
      const s = score(fw, words(name));
      if (s > top) [top, hits] = [s, [name]];
      else if (s === top && s > 0) hits.push(name);
    }
    if (top === 0) unmatched.push(file);
    else if (hits.length > 1) ambiguous.push(`${file} (could be ${hits.join(" / ")})`);
    else if (photos[hits[0]]) extra.push(`${file} (${hits[0]} already has a photo)`);
    else if (!best[hits[0]] || top > best[hits[0]].score) {
      if (best[hits[0]]) extra.push(`${best[hits[0]].file} (${hits[0]} has a better match)`);
      best[hits[0]] = { file, score: top };
    } else extra.push(`${file} (${hits[0]} has a better match)`);
  }
  for (const [name, { file }] of Object.entries(best)) photos[name] = url(file);

  const sorted = Object.fromEntries(Object.entries(photos).sort(([a], [b]) => a.localeCompare(b)));
  const roster = players
    .filter((p) => !p.hidden)
    .map(({ hidden: _hidden, ...p }) => ({ ...p, photo_url: sorted[p.name] ?? null }));
  const out = path.join(root, "src/data/roster.json");
  const json = JSON.stringify(roster, null, 2) + "\n";
  if (!existsSync(out) || readFileSync(out, "utf8") !== json) writeFileSync(out, json);

  const visible = [...new Set(players.filter((p) => !p.hidden).map((p) => p.name))];
  const report = {
    linked: Object.keys(sorted).length,
    missing: visible.filter((n) => !sorted[n]).sort(),
    unmatched,
    ambiguous,
    extra,
    unsupported: all.filter((f) => UNSUPPORTED.test(f)),
  };
  if (log) {
    console.log(`Photos linked: ${report.linked}`);
    for (const [name, { file }] of Object.entries(best)) console.log(`  matched by name: ${file} -> ${name}`);
    if (report.missing.length) console.log(`No photo yet (${report.missing.length}): ${report.missing.join(", ")}`);
    if (unmatched.length) console.log(`Files that match no player: ${unmatched.join(", ")}`);
    if (ambiguous.length) console.log(`Files that match more than one player: ${ambiguous.join(", ")}`);
    if (extra.length) console.log(`Extra photos, not used: ${extra.join(", ")}`);
    if (report.unsupported.length) console.log(`Not a web image (save as .jpg): ${report.unsupported.join(", ")}`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  matchPhotos(process.cwd(), { log: true });
}
