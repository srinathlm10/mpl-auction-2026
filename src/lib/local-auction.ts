import { DEFAULT_SLABS, incrementFor, validateSlabs } from "./auction";
import { formatPrice } from "./format";
import type { AuctionSettings, AuctionSnapshot, AuctionState, Bid, Player, PlayerStatus, Sport, Team } from "./types";

/*
 * The live auction, run entirely in the browser (no database).
 *
 * The player list, teams and sports come from the static files in src/data. Everything
 * that happens during the auction – who was sold to whom and for how much, bids,
 * settings and the live state – is kept in one "store" object, saved in the browser
 * (see use-local-auction.ts) and shared with the projector window.
 *
 * Every action below is a pure function: it checks the rules, then returns a new store.
 * They mirror the database functions the site used before, with the same messages.
 */

export interface PlayerResult {
  status: PlayerStatus;
  team_id: number | null;
  sold_price: number | null;
  /** Stored so a result can never land on a different player if the list is edited. */
  name: string;
}

export interface AuctionStore {
  version: 1;
  /** Increases with every change; the newest store wins between windows. */
  savedAt: number;
  state: AuctionState;
  settings: AuctionSettings;
  /** Squad size per sport id (overrides src/data/sports.json). */
  squadSizes: Record<string, number>;
  /** Auction result per player id (overrides src/data/players.json). */
  results: Record<string, PlayerResult>;
  /** Every bid, including undone ones (voided_at set). */
  bids: Bid[];
  nextBidId: number;
}

export interface StaticData {
  sports: Sport[];
  teams: Array<Omit<Team, "remaining_purse"> & { remaining_purse?: number }>;
  players: Player[];
}

const now = () => new Date().toISOString();

export function initialStore(): AuctionStore {
  return {
    version: 1,
    savedAt: Date.now(),
    state: {
      id: 1,
      sport_id: null,
      current_player_id: null,
      current_bid: null,
      highest_team_id: null,
      status: "idle",
      spin_id: 0,
      pool: null,
      updated_at: now(),
    },
    settings: { id: 1, base_price: 100_000, increment_slabs: DEFAULT_SLABS },
    squadSizes: {},
    results: {},
    bids: [],
    nextBidId: 1,
  };
}

/** True when `x` looks like a store saved by this version of the site. */
export function isStore(x: unknown): x is AuctionStore {
  const s = x as AuctionStore;
  return !!s && s.version === 1 && typeof s.savedAt === "number" && !!s.state && !!s.settings && typeof s.results === "object" && Array.isArray(s.bids);
}

/* ------------------------------------------------------------ derived view */

/** Static data + auction results = what every screen shows. */
export function deriveSnapshot(store: AuctionStore, data: StaticData): AuctionSnapshot {
  const base = store.settings.base_price;
  const players: Player[] = data.players.map((p) => {
    const r = store.results[p.id];
    const result = r && r.name === p.name ? r : null;
    return {
      ...p,
      base_price: p.status === "sold" && !result ? p.base_price : base,
      status: result ? result.status : p.status,
      team_id: result ? result.team_id : p.team_id,
      sold_price: result ? result.sold_price : p.sold_price,
    };
  });
  const sports: Sport[] = data.sports.map((s) => ({ ...s, squad_size: store.squadSizes[s.id] ?? s.squad_size }));
  const teams: Team[] = data.teams.map((t) => ({
    ...t,
    remaining_purse:
      t.total_purse -
      players.filter((p) => p.team_id === t.id && p.status === "sold").reduce((sum, p) => sum + (p.sold_price ?? 0), 0),
  }));
  const bids = store.bids
    .filter((b) => b.player_id === store.state.current_player_id && !b.voided_at)
    .sort((a, b) => b.id - a.id);
  return { state: store.state, settings: store.settings, sports, teams, players, bids };
}

/* ----------------------------------------------------------------- actions */

type Args = Record<string, unknown>;

class Ctx {
  store: AuctionStore;
  view: AuctionSnapshot;
  constructor(
    store: AuctionStore,
    private data: StaticData,
  ) {
    this.store = structuredClone(store);
    this.view = deriveSnapshot(this.store, data);
  }
  get st() {
    return this.store.state;
  }
  setState(patch: Partial<AuctionState>) {
    this.store.state = { ...this.store.state, ...patch, updated_at: now() };
  }
  player(id: number | null) {
    return this.view.players.find((p) => p.id === id);
  }
  team(id: number) {
    return this.view.teams.find((t) => t.id === id);
  }
  squadSize(sportId: number) {
    return this.view.sports.find((s) => s.id === sportId)?.squad_size ?? 11;
  }
  bought(teamId: number) {
    return this.view.players.filter((p) => p.team_id === teamId && p.status === "sold").length;
  }
  setResult(playerId: number, result: Omit<PlayerResult, "name">) {
    const p = this.data.players.find((x) => x.id === playerId);
    if (!p) throw new Error("Unknown player.");
    this.store.results[playerId] = { ...result, name: p.name };
    this.view = deriveSnapshot(this.store, this.data);
  }
  activeBids(playerId: number | null) {
    return this.store.bids.filter((b) => b.player_id === playerId && !b.voided_at).sort((a, b) => b.id - a.id);
  }
  addBid(teamId: number, amount: number) {
    this.store.bids.push({
      id: this.store.nextBidId++,
      player_id: this.st.current_player_id as number,
      team_id: teamId,
      amount,
      created_at: now(),
      voided_at: null,
    });
  }
  /** Same rule as bidding: squad not full, and the purse must still cover the rest of the squad at base price. */
  checkCanPay(team: Team, amount: number, verb: string) {
    const squad = this.squadSize(team.sport_id);
    const bought = this.bought(team.id);
    if (bought >= squad) throw new Error(`${team.name} already has a full squad.`);
    const reserve = (squad - bought - 1) * this.store.settings.base_price;
    if (team.remaining_purse - amount < reserve) {
      throw new Error(`${team.name} cannot afford this ${verb}: it must keep ${formatPrice(reserve)} for ${squad - bought - 1} more player(s).`);
    }
  }
}

const num = (v: unknown) => (typeof v === "number" ? v : v === null || v === undefined || v === "" ? null : Number(v));

const actions: Record<string, (c: Ctx, args: Args) => unknown> = {
  auction_set_sport(c, { p_sport_id }) {
    if (c.st.status === "spinning" || c.st.status === "bidding") throw new Error("Finish the current player before changing the sport.");
    const id = num(p_sport_id);
    if (!c.view.sports.some((s) => s.id === id)) throw new Error("Unknown sport.");
    c.setState({ sport_id: id, pool: null, current_player_id: null, current_bid: null, highest_team_id: null, status: "idle" });
  },

  auction_set_pool(c, { p_pool }) {
    if (c.st.status === "spinning" || c.st.status === "bidding") throw new Error("Finish the current player before switching wheels.");
    const pool = String(p_pool ?? "").trim() || null;
    c.setState({ pool, current_player_id: null, current_bid: null, highest_team_id: null, status: "idle" });
  },

  auction_select_player(c, { p_player_id }) {
    if (c.st.sport_id === null) throw new Error("Choose a sport first.");
    if (c.st.status === "spinning" || c.st.status === "bidding") throw new Error("A player is already on the block.");
    const p = c.player(num(p_player_id));
    if (!p || p.sport_id !== c.st.sport_id || p.status !== "available") throw new Error("That player is not available in this sport.");
    c.setState({ current_player_id: p.id, current_bid: null, highest_team_id: null, status: "spinning", spin_id: c.st.spin_id + 1 });
  },

  auction_start_bidding(c) {
    if (c.st.status !== "spinning") throw new Error("Spin the wheel first.");
    c.setState({ status: "bidding", current_bid: c.store.settings.base_price, highest_team_id: null });
  },

  auction_place_bid(c, { p_team_id, p_expected }) {
    if (c.st.status !== "bidding") throw new Error("Bidding is not open.");
    const team = c.team(num(p_team_id) ?? -1);
    if (!team || team.sport_id !== c.st.sport_id) throw new Error("That team does not play this sport.");
    if (c.st.highest_team_id === team.id) throw new Error(`${team.name} already holds the highest bid.`);
    const current = c.st.current_bid ?? c.store.settings.base_price;
    const amount = current + incrementFor(current, c.store.settings.increment_slabs);
    const expected = num(p_expected);
    if (expected !== null && expected !== amount) throw new Error("The bid has changed. Please try again.");
    c.checkCanPay(team, amount, "bid");
    c.addBid(team.id, amount);
    c.setState({ current_bid: amount, highest_team_id: team.id });
  },

  auction_undo_bid(c) {
    if (c.st.status !== "bidding") throw new Error("Bidding is not open.");
    const [last] = c.activeBids(c.st.current_player_id);
    if (!last) throw new Error("There is no bid to undo.");
    c.store.bids = c.store.bids.map((b) => (b.id === last.id ? { ...b, voided_at: now() } : b));
    const [prev] = c.activeBids(c.st.current_player_id);
    c.setState({ current_bid: prev?.amount ?? c.store.settings.base_price, highest_team_id: prev?.team_id ?? null });
  },

  auction_sold(c) {
    if (c.st.status !== "bidding") throw new Error("Bidding is not open.");
    if (c.st.highest_team_id === null) throw new Error("Nobody has bid yet. Use Unsold instead.");
    c.setResult(c.st.current_player_id as number, { status: "sold", team_id: c.st.highest_team_id, sold_price: c.st.current_bid });
    c.setState({ status: "sold" });
  },

  auction_unsold(c) {
    if (c.st.status !== "spinning" && c.st.status !== "bidding") throw new Error("No player is on the block.");
    if (c.activeBids(c.st.current_player_id).length > 0) throw new Error("Bids have been placed. Undo them, or sell the player.");
    c.setResult(c.st.current_player_id as number, { status: "unsold", team_id: null, sold_price: null });
    c.setState({ status: "unsold", current_bid: null, highest_team_id: null });
  },

  auction_assign(c, { p_team_id, p_price }) {
    if (c.st.status !== "spinning" && c.st.status !== "bidding") throw new Error("No player is on the block.");
    const team = c.team(num(p_team_id) ?? -1);
    if (!team || team.sport_id !== c.st.sport_id) throw new Error("That team does not play this sport.");
    const base = c.store.settings.base_price;
    const price = num(p_price) ?? (c.st.status === "bidding" ? (c.st.current_bid ?? base) : base);
    if (!Number.isFinite(price) || price < base) throw new Error("The price cannot be below the base price.");
    c.checkCanPay(team, price, "price");
    c.addBid(team.id, price);
    c.setResult(c.st.current_player_id as number, { status: "sold", team_id: team.id, sold_price: price });
    c.setState({ status: "sold", current_bid: price, highest_team_id: team.id });
  },

  auction_undo_result(c) {
    const id = c.st.current_player_id as number;
    if (c.st.status === "sold") {
      c.setResult(id, { status: "available", team_id: null, sold_price: null });
      c.setState({ status: "bidding" });
    } else if (c.st.status === "unsold") {
      c.setResult(id, { status: "available", team_id: null, sold_price: null });
      c.setState({ status: "spinning" });
    } else {
      throw new Error("There is no result to undo.");
    }
  },

  auction_bring_back_unsold(c) {
    if (c.st.sport_id === null) throw new Error("Choose a sport first.");
    const unsold = c.view.players.filter((p) => p.sport_id === c.st.sport_id && p.status === "unsold");
    for (const p of unsold) c.setResult(p.id, { status: "available", team_id: null, sold_price: null });
    c.setState({});
    return unsold.length;
  },

  auction_reset_sport(c, { p_sport_id }) {
    const sportId = num(p_sport_id);
    const ids = new Set(c.view.players.filter((p) => p.sport_id === sportId).map((p) => p.id));
    c.store.bids = c.store.bids.filter((b) => !ids.has(b.player_id));
    for (const id of ids) c.setResult(id, { status: "available", team_id: null, sold_price: null });
    c.setState({ sport_id: sportId, pool: null, current_player_id: null, current_bid: null, highest_team_id: null, status: "idle" });
  },

  auction_save_settings(c, { p_base_price, p_slabs, p_squads }) {
    const base = num(p_base_price);
    if (base === null || !Number.isInteger(base) || base <= 0) throw new Error("Base price must be a positive amount.");
    const slabs = p_slabs as AuctionSettings["increment_slabs"];
    const slabError = Array.isArray(slabs) ? validateSlabs(slabs) : "Add at least one bid increment slab.";
    if (slabError) throw new Error(slabError);
    const squads = (p_squads ?? {}) as Record<string, number>;
    for (const n of Object.values(squads)) {
      if (!Number.isInteger(n) || n < 1 || n > 50) throw new Error("Squad size must be between 1 and 50.");
    }
    c.store.settings = { ...c.store.settings, base_price: base, increment_slabs: slabs };
    c.store.squadSizes = { ...c.store.squadSizes, ...squads };
  },
};

/** Runs one auction action. Throws an Error with a readable message when a rule is broken. */
export function runAction(store: AuctionStore, data: StaticData, name: string, args: Args = {}): { store: AuctionStore; result: unknown } {
  const action = actions[name];
  if (!action) throw new Error(`Unknown action: ${name}`);
  const c = new Ctx(store, data);
  const result = action(c, args);
  c.store.savedAt = Math.max(Date.now(), store.savedAt + 1);
  return { store: c.store, result: result ?? c.store.state };
}
