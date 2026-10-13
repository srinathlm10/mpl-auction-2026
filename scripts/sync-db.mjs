// Makes the live database match src/data/*.json – no SQL needed.
//
//   npm run db:sync          apply the changes
//   npm run db:sync -- --dry show what would change, change nothing
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local (server-only key,
// never commit it, never prefix it with NEXT_PUBLIC_).
//
// Safe during an auction: players are matched by sport + name, and a player who is
// already SOLD is never changed or removed. Auction results, bids, purses and the
// settings (base price, squad sizes) are left alone.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const dry = process.argv.includes("--dry");

const env = { ...process.env };
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (add them to .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const read = (name) => JSON.parse(readFileSync(`src/data/${name}.json`, "utf8"));
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

const sports = read("sports");
const teams = read("teams");
const players = read("players");

const log = [];
let changes = 0;
const plan = (msg) => {
  changes++;
  log.push(msg);
};

// --- sports (matched by slug; existing squad sizes are kept – they are a setting)
const dbSports = must(await db.from("sports").select("*"), "load sports");
const sportIdMap = new Map(); // json id -> db id
for (const s of sports) {
  let row = dbSports.find((d) => d.slug === s.slug);
  if (!row) {
    plan(`+ sport ${s.name}`);
    if (!dry) row = must(await db.from("sports").insert({ name: s.name, slug: s.slug, squad_size: s.squad_size }).select().single(), "add sport");
  }
  if (row) sportIdMap.set(s.id, row.id);
}

// --- teams (matched by id): name, captain and logo; purses are left alone
const dbTeams = must(await db.from("teams").select("*"), "load teams");
for (const t of teams) {
  const sportId = sportIdMap.get(t.sport_id);
  const row = dbTeams.find((d) => d.id === t.id);
  if (!row) {
    plan(`+ team ${t.name}`);
    if (!dry) must(await db.from("teams").insert({ name: t.name, sport_id: sportId, captain: t.captain, logo_url: t.logo_url, total_purse: t.total_purse }), "add team");
    continue;
  }
  const patch = {};
  if (row.name !== t.name) patch.name = t.name;
  if ((row.captain ?? "") !== (t.captain ?? "")) patch.captain = t.captain;
  if ((row.logo_url ?? null) !== (t.logo_url ?? null)) patch.logo_url = t.logo_url;
  if (Object.keys(patch).length) {
    plan(`~ team ${row.name}: ${Object.keys(patch).join(", ")}`);
    if (!dry) must(await db.from("teams").update(patch).eq("id", row.id), "update team");
  }
}

// --- players (matched by sport + name)
const settings = must(await db.from("auction_settings").select("base_price").eq("id", 1).maybeSingle(), "load settings");
const basePrice = settings?.base_price ?? 100000;
const dbPlayers = must(await db.from("players").select("*"), "load players");
const wanted = new Map(); // "sportId|name" -> json player
for (const p of players) {
  const sportId = sportIdMap.get(p.sport_id);
  if (sportId === undefined) continue;
  const k = `${sportId}|${norm(p.name)}`;
  if (wanted.has(k)) {
    console.error(`Duplicate in players.json: "${p.name}" appears twice in the same sport. Fix it and run again.`);
    process.exit(1);
  }
  wanted.set(k, { ...p, sport_id: sportId });
}

const toInsert = [];
for (const [k, p] of wanted) {
  const row = dbPlayers.find((d) => `${d.sport_id}|${norm(d.name)}` === k);
  const details = {
    name: p.name,
    batch: p.batch ?? "",
    role_or_position: p.role_or_position ?? "",
    skills: p.skills ?? {},
    attributes: p.attributes ?? {},
    photo_url: p.photo_url ?? null,
  };
  if (!row) {
    toInsert.push({ ...details, sport_id: p.sport_id, base_price: basePrice, status: "available" });
    plan(`+ ${p.name} (sport ${p.sport_id})`);
    continue;
  }
  const patch = {};
  for (const [field, value] of Object.entries(details)) if (!same(row[field], value)) patch[field] = value;
  if (Object.keys(patch).length) {
    plan(`~ ${row.name}: ${Object.keys(patch).join(", ")}`);
    if (!dry) must(await db.from("players").update(patch).eq("id", row.id), `update ${row.name}`);
  }
}
if (toInsert.length && !dry) must(await db.from("players").insert(toInsert), "add players");

const toRemove = [];
for (const d of dbPlayers) {
  if (!sportIdMap.size || wanted.has(`${d.sport_id}|${norm(d.name)}`)) continue;
  if (d.status === "sold") {
    log.push(`! kept ${d.name} – not in players.json but already SOLD`);
    continue;
  }
  toRemove.push(d.id);
  plan(`- ${d.name} (sport ${d.sport_id})`);
}
if (toRemove.length && !dry) must(await db.from("players").delete().in("id", toRemove), "remove players");

for (const line of log) console.log(line);
const counts = must(await db.from("players").select("sport_id"), "count players").reduce((m, p) => ((m[p.sport_id] = (m[p.sport_id] ?? 0) + 1), m), {});
console.log(`\n${dry ? "Dry run – would make" : "Done –"} ${changes} change${changes === 1 ? "" : "s"}. Players per sport now: ${JSON.stringify(counts)}`);
