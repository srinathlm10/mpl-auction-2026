import { bidAmountError, checkTeamBid, DEFAULT_SLABS, incrementFor, validateSlabs } from "./auction";
import { basePlayers, baseSports, baseTeams } from "./data";
import { formatCompact } from "./format";
import type { AuctionSettings, AuctionSnapshot, AuctionState, Bid, BidSlab, Player, PlayerStatus, Team } from "./types";

/*
 * The live auction, run entirely in the browser. Player and team details come
 * from src/data/*.json; everything the auction changes (results, bids, live
 * state, settings) is saved in this browser's localStorage, so a page refresh
 * keeps the auction exactly where it was. Other windows of the same browser
 * (the projector screen at /auction/screen) follow along live.
 */

const STORAGE_KEY = "mpl-auction-v1";

interface PlayerResult {
  status: PlayerStatus;
  team_id: number | null;
  sold_price: number | null;
}

export interface AuctionStore {
  version: 1;
  state: AuctionState;
  settings: AuctionSettings;
  /** Squad size per sport id (overrides src/data/sports.json). */
  squadSizes: Record<number, number>;
  /** Results per player id; players not listed are still available. */
  results: Record<number, PlayerResult>;
  /** Every bid, newest last; undone bids keep a voided_at. */
  bids: Bid[];
  nextBidId: number;
}

export function initialStore(): AuctionStore {
  return {
    version: 1,
    state: {
      id: 1,
      sport_id: null,
      current_player_id: null,
      current_bid: null,
      highest_team_id: null,
      status: "idle",
      pool: null,
      spin_id: 0,
      updated_at: new Date(0).toISOString(),
    },
    settings: { id: 1, base_price: basePlayers[0]?.base_price ?? 100_000, increment_slabs: DEFAULT_SLABS },
    squadSizes: {},
    results: {},
    bids: [],
    nextBidId: 1,
  };
}

/* ----------------------------------------------------------- derived data */

/** Sports, players and teams with the auction results applied. */
export function applyResults(store: AuctionStore) {
  const sports = baseSports.map((s) => ({ ...s, squad_size: store.squadSizes[s.id] ?? s.squad_size }));
  const players: Player[] = basePlayers.map((p) => {
    const r = store.results[p.id];
    return {
      ...p,
      base_price: store.settings.base_price,
      status: r?.status ?? "available",
      team_id: r?.status === "sold" ? r.team_id : null,
      sold_price: r?.status === "sold" ? r.sold_price : null,
    };
  });
  const teams: Team[] = baseTeams.map((t) => ({
    ...t,
    remaining_purse:
      t.total_purse -
      players.filter((p) => p.team_id === t.id && p.status === "sold").reduce((sum, p) => sum + (p.sold_price ?? 0), 0),
  }));
  return { sports, players, teams };
}

export function snapshotOf(store: AuctionStore): AuctionSnapshot {
  const { sports, players, teams } = applyResults(store);
  const bids = store.bids
    .filter((b) => b.player_id === store.state.current_player_id && !b.voided_at)
    .reverse();
  return { state: store.state, settings: store.settings, sports, teams, players, bids };
}

/* --------------------------------------------------------------- actions */

type Args = Record<string, unknown>;
type Action = (draft: AuctionStore, args: Args) => string | void;

const fail = (message: string): never => {
  throw new Error(message);
};

function setState(draft: AuctionStore, patch: Partial<AuctionState>) {
  draft.state = { ...draft.state, ...patch, updated_at: new Date().toISOString() };
}

function onBlock(draft: AuctionStore) {
  const { state } = draft;
  if (state.status !== "spinning" && state.status !== "bidding") fail("No player is on the block.");
  return state.current_player_id as number;
}

/** The team (of the sport being auctioned) and whether it may pay `amount`. */
function teamFor(draft: AuctionStore, teamId: number, amount: number, isHighest: boolean) {
  const { sports, players, teams } = applyResults(draft);
  const team = teams.find((t) => t.id === teamId && t.sport_id === draft.state.sport_id) ?? fail("That team does not play this sport.");
  const squadSize = sports.find((s) => s.id === team.sport_id)?.squad_size ?? 0;
  const bought = players.filter((p) => p.team_id === team.id && p.status === "sold").length;
  const check = checkTeamBid({ team, bought, squadSize, amount, basePrice: draft.settings.base_price, isHighest });
  if (!check.ok) fail(`${team.name}: ${check.reason}`);
  return team;
}

function addBid(draft: AuctionStore, playerId: number, teamId: number, amount: number) {
  draft.bids.push({ id: draft.nextBidId++, player_id: playerId, team_id: teamId, amount, created_at: new Date().toISOString(), voided_at: null });
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

const actions: Record<string, Action> = {
  auction_set_sport(draft, { p_sport_id }) {
    if (draft.state.status === "spinning" || draft.state.status === "bidding") fail("Finish the current player before changing the sport.");
    const id = num(p_sport_id);
    if (!baseSports.some((s) => s.id === id)) fail("Unknown sport.");
    setState(draft, { sport_id: id, pool: null, current_player_id: null, current_bid: null, highest_team_id: null, status: "idle" });
  },

  auction_set_pool(draft, { p_pool }) {
    if (draft.state.status === "spinning" || draft.state.status === "bidding") fail("Finish the current player before switching wheels.");
    const pool = String(p_pool ?? "").trim() || null;
    setState(draft, { pool, current_player_id: null, current_bid: null, highest_team_id: null, status: "idle" });
  },

  auction_select_player(draft, { p_player_id }) {
    const { state } = draft;
    if (state.sport_id === null) fail("Choose a sport first.");
    if (state.status === "spinning" || state.status === "bidding") fail("A player is already on the block.");
    const id = num(p_player_id);
    const player = basePlayers.find((p) => p.id === id && p.sport_id === state.sport_id);
    if (!player || draft.results[player.id]) fail("That player is not available in this sport.");
    setState(draft, { current_player_id: id, current_bid: null, highest_team_id: null, status: "spinning", spin_id: state.spin_id + 1 });
  },

  auction_start_bidding(draft) {
    if (draft.state.status !== "spinning") fail("Spin the wheel first.");
    setState(draft, { status: "bidding", current_bid: draft.settings.base_price, highest_team_id: null });
  },

  auction_place_bid(draft, { p_team_id, p_expected }) {
    const { state, settings } = draft;
    if (state.status !== "bidding") fail("Bidding is not open.");
    const current = state.current_bid ?? settings.base_price;
    const hasBids = state.highest_team_id !== null;
    const amount = num(p_expected) ?? current + incrementFor(current, settings.increment_slabs);
    const error = bidAmountError(amount, current, settings.base_price, hasBids);
    if (error) fail(error);
    const teamId = num(p_team_id) as number;
    if (teamId === state.highest_team_id) fail("That team already holds the highest bid.");
    teamFor(draft, teamId, amount, false);
    addBid(draft, state.current_player_id as number, teamId, amount);
    setState(draft, { current_bid: amount, highest_team_id: teamId });
  },

  auction_undo_bid(draft) {
    const { state } = draft;
    if (state.status !== "bidding") fail("Bidding is not open.");
    const active = draft.bids.filter((b) => b.player_id === state.current_player_id && !b.voided_at);
    const last = active.at(-1) ?? fail("There is no bid to undo.");
    draft.bids = draft.bids.map((b) => (b.id === last.id ? { ...b, voided_at: new Date().toISOString() } : b));
    const prev = active.at(-2);
    setState(draft, { current_bid: prev?.amount ?? draft.settings.base_price, highest_team_id: prev?.team_id ?? null });
  },

  auction_sold(draft) {
    const { state } = draft;
    if (state.status !== "bidding") fail("Bidding is not open.");
    if (state.highest_team_id === null) fail("Nobody has bid yet. Use Unsold instead.");
    draft.results = {
      ...draft.results,
      [state.current_player_id as number]: { status: "sold", team_id: state.highest_team_id, sold_price: state.current_bid },
    };
    setState(draft, { status: "sold" });
  },

  auction_unsold(draft) {
    const playerId = onBlock(draft);
    if (draft.bids.some((b) => b.player_id === playerId && !b.voided_at)) fail("Bids have been placed. Undo them, or sell the player.");
    draft.results = { ...draft.results, [playerId]: { status: "unsold", team_id: null, sold_price: null } };
    setState(draft, { status: "unsold", current_bid: null, highest_team_id: null });
  },

  auction_assign(draft, { p_team_id, p_price }) {
    const playerId = onBlock(draft);
    const { state, settings } = draft;
    const price = num(p_price) ?? (state.status === "bidding" ? state.current_bid : null) ?? settings.base_price;
    if (!Number.isInteger(price) || price < settings.base_price) fail(`The price cannot be below the base price (${formatCompact(settings.base_price)}).`);
    const team = teamFor(draft, num(p_team_id) as number, price, false);
    addBid(draft, playerId, team.id, price);
    draft.results = { ...draft.results, [playerId]: { status: "sold", team_id: team.id, sold_price: price } };
    setState(draft, { status: "sold", current_bid: price, highest_team_id: team.id });
  },

  auction_undo_result(draft) {
    const { state } = draft;
    const playerId = state.current_player_id as number;
    const results = { ...draft.results };
    delete results[playerId];
    if (state.status === "sold") {
      draft.results = results;
      setState(draft, { status: "bidding" });
    } else if (state.status === "unsold") {
      draft.results = results;
      setState(draft, { status: "spinning" });
    } else {
      fail("There is no result to undo.");
    }
  },

  auction_bring_back_unsold(draft) {
    const sportId = draft.state.sport_id ?? fail("Choose a sport first.");
    const results = { ...draft.results };
    let n = 0;
    for (const p of basePlayers) {
      if (p.sport_id === sportId && results[p.id]?.status === "unsold") {
        delete results[p.id];
        n++;
      }
    }
    draft.results = results;
    setState(draft, {});
    return `${n} unsold player${n === 1 ? "" : "s"} back on the wheel for round two.`;
  },

  auction_reset_sport(draft, { p_sport_id }) {
    const sportId = num(p_sport_id);
    const ids = new Set(basePlayers.filter((p) => p.sport_id === sportId).map((p) => p.id));
    draft.bids = draft.bids.filter((b) => !ids.has(b.player_id));
    draft.results = Object.fromEntries(Object.entries(draft.results).filter(([id]) => !ids.has(Number(id))));
    setState(draft, { sport_id: sportId, pool: null, current_player_id: null, current_bid: null, highest_team_id: null, status: "idle" });
  },

  auction_save_settings(draft, { p_base_price, p_slabs, p_squads }) {
    const base = num(p_base_price);
    if (base === null || !Number.isInteger(base) || base <= 0) fail("Base price must be a positive whole number.");
    const slabs = p_slabs as BidSlab[];
    const slabError = validateSlabs(slabs);
    if (slabError) fail(slabError);
    const squads = { ...draft.squadSizes };
    for (const [id, value] of Object.entries((p_squads ?? {}) as Record<string, unknown>)) {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 50) fail("Squad size must be a whole number from 1 to 50.");
      squads[Number(id)] = n;
    }
    draft.settings = { ...draft.settings, base_price: base as number, increment_slabs: slabs };
    draft.squadSizes = squads;
  },
};

/* ------------------------------------------------- storage and live sync */

let memory: AuctionStore | null = null; // used when localStorage is blocked
let cachedRaw: string | null | undefined;
let cachedStore: AuctionStore | null = null;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The saved auction (or a fresh one). Same object until something changes. */
export function getStore(): AuctionStore {
  const raw = readRaw();
  if (raw === null && memory) return memory;
  if (raw !== cachedRaw || !cachedStore) {
    cachedRaw = raw;
    let parsed: AuctionStore | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as AuctionStore) : null;
    } catch {
      parsed = null;
    }
    cachedStore = parsed?.version === 1 ? { ...initialStore(), ...parsed } : initialStore();
  }
  return cachedStore;
}

const serverStore = initialStore();
/** What the server renders (no results yet); the browser swaps in the saved auction. */
export const getServerStore = () => serverStore;

function save(next: AuctionStore) {
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    memory = null;
  } catch {
    memory = next;
  }
  cachedRaw = raw;
  cachedStore = next;
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  // Changes made in another window (e.g. the control screen) reach this one here.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Runs one auction action. Throws an Error with a readable message if the rules say no. */
export function runAction(name: string, args: Args = {}): string | void {
  const action = actions[name] ?? fail(`Unknown action ${name}.`);
  const draft = structuredClone(getStore());
  const message = action(draft, args);
  save(draft);
  return message;
}

/** Full backup of the auction (results, bids, settings) as JSON text. */
export function exportStore(): string {
  return JSON.stringify(getStore(), null, 2);
}

export function importStore(text: string) {
  const parsed = JSON.parse(text) as AuctionStore;
  if (parsed?.version !== 1 || !parsed.state || !parsed.results) throw new Error("That file is not an MPL auction backup.");
  save({ ...initialStore(), ...parsed });
}

/** Wipes every result, bid and setting in this browser. */
export function resetStore() {
  save(initialStore());
}
