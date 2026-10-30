import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { liveConfigured, supabaseKey, supabaseUrl } from "./live-config";
import { normalizeRow, normalizeSquads, type LiveRow, type LiveSport, type LiveState, type Squads } from "./live";

/*
 * One shared connection to the live scores for the whole page.
 *
 * - Every score is read once, then kept up to date by Supabase Realtime (pushed within a second).
 *   Only the pages where people WATCH a match open that live connection (each one counts towards
 *   the Supabase plan's limit); the home page just asks again every 20 seconds.
 * - If the live connection is not working (or the limit is reached) the page quietly asks every few
 *   seconds instead, and also whenever the tab comes back to the front, so a score is never stuck.
 * - It starts with the first component that needs it and stops shortly after the last one goes away.
 */

/** The scorer's ID and password, sent with every change; the database refuses a wrong one. */
export interface ScorerLogin {
  user: string;
  password: string;
}

export type ConnectionStatus = "off" | "connecting" | "live" | "polling";

export interface LiveSnapshot {
  rows: Record<string, LiveRow>;
  /** Players of each team (team id -> names), once the squads have been published. */
  squads: Squads;
  status: ConnectionStatus;
  /** True once the scores have been read at least once. */
  loaded: boolean;
  /** The last read failed (no internet, wrong settings, tables not created). */
  error: string | null;
}

const EMPTY: LiveSnapshot = { rows: {}, squads: {}, status: "off", loaded: false, error: null };

const TABLE = "live_matches";
const SQUADS_TABLE = "live_squads";
const POLL_WHILE_PUSHED_MS = 60_000; // safety net while Realtime is working
const POLL_FALLBACK_MS = 8_000; // main way of updating when Realtime is not working
const POLL_LIGHT_MS = 20_000; // pages that only glance at the scores (home page)
const CLOCK_RESYNC_MS = 5 * 60_000;

let snapshot: LiveSnapshot = EMPTY;
const listeners = new Set<() => void>();
let realtimeCount = 0;
let channel: RealtimeChannel | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let generation = 0;
/** Matches with a save still in flight; their rows are not overwritten by older data arriving from the server. */
const saving = new Map<string, number>();

function set(patch: Partial<LiveSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

export const getSnapshot = () => snapshot;
export const getServerSnapshot = () => EMPTY;

/* ------------------------------------------------------------------- client */

let clientPromise: Promise<SupabaseClient> | null = null;

/** The Supabase client. Loaded on first use so pages that never need it do not download it. */
export function getClient(): Promise<SupabaseClient> {
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(supabaseUrl, supabaseKey, {
      // No accounts on this site: nothing to sign in to, so there is no session to keep.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 10 } },
    }),
  );
  return clientPromise;
}

/* -------------------------------------------------------------- server time */
/*
 * The match clock counts from the moment a half kicked off (a time saved with the match). To show the
 * same minute on every phone, "now" is the server's time: we ask the database for it now and then and
 * remember how far this device's clock is off.
 */

let clockSkewMs = 0;
let lastClockSync = 0;

/** The current time, corrected to the server's clock once it is known. */
export function serverNow(): Date {
  return new Date(Date.now() + clockSkewMs);
}

async function syncClock(client: SupabaseClient) {
  if (Date.now() - lastClockSync < CLOCK_RESYNC_MS) return;
  lastClockSync = Date.now();
  try {
    const before = Date.now();
    const { data, error } = await client.rpc("live_now");
    const after = Date.now();
    const server = typeof data === "string" ? Date.parse(data) : NaN;
    if (!error && !Number.isNaN(server)) clockSkewMs = server - (before + after) / 2; // assume the reply took the same time each way
  } catch {
    /* keep the last known skew */
  }
}

/* ------------------------------------------------------------------ reading */

async function refresh(gen: number) {
  try {
    const client = await getClient();
    void syncClock(client);
    const [matchesResult, squadsResult] = await Promise.all([client.from(TABLE).select("*"), client.from(SQUADS_TABLE).select("*")]);
    if (gen !== generation) return;
    if (matchesResult.error) throw new Error(matchesResult.error.message);

    const rows: Record<string, LiveRow> = {};
    for (const raw of matchesResult.data ?? []) {
      const row = normalizeRow(raw);
      if (row) rows[row.id] = row;
    }
    for (const id of saving.keys()) {
      if (snapshot.rows[id]) rows[id] = snapshot.rows[id];
    }

    // Squads are optional: if the table is missing or empty, scorers pick from the whole player list.
    let squads = snapshot.squads;
    if (!squadsResult.error) {
      squads = {};
      for (const raw of squadsResult.data ?? []) Object.assign(squads, normalizeSquads((raw as { squads?: unknown }).squads));
    }
    set({ rows, squads, loaded: true, error: null });
  } catch (e) {
    if (gen !== generation) return;
    set({ loaded: true, error: e instanceof Error ? e.message : "Could not load the scores." });
  }
}

function schedulePoll(gen: number) {
  if (gen !== generation) return;
  const base = snapshot.status === "live" ? POLL_WHILE_PUSHED_MS : realtimeCount > 0 ? POLL_FALLBACK_MS : POLL_LIGHT_MS;
  const delay = base + Math.random() * 1500; // spread visitors out so they do not all ask at the same moment
  pollTimer = setTimeout(async () => {
    await refresh(gen);
    schedulePoll(gen);
  }, delay);
}

function onVisible() {
  if (document.visibilityState === "visible" && running) void refresh(generation);
}

/** Opens or closes the live (pushed) connection depending on whether any watching page needs it. */
async function syncChannel(gen: number) {
  if (gen !== generation) return;
  if (realtimeCount === 0) {
    if (channel) {
      const old = channel;
      channel = null;
      const client = await getClient();
      await client.removeChannel(old);
    }
    if (gen === generation && snapshot.status !== "polling") set({ status: "polling" });
    return;
  }
  if (channel) return;

  const client = await getClient();
  if (gen !== generation || channel || realtimeCount === 0) return;
  set({ status: "connecting" });
  channel = client
    .channel("live-matches-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (payload) => {
      if (gen !== generation) return;
      const changed = (payload.eventType === "DELETE" ? payload.old : payload.new) as { id?: string } | null;
      if (changed?.id && saving.has(changed.id)) return; // our own save is still going; its result is already on screen
      if (payload.eventType === "DELETE") {
        if (!changed?.id) return;
        const rows = { ...snapshot.rows };
        delete rows[changed.id];
        set({ rows });
        return;
      }
      const row = normalizeRow(payload.new);
      if (row) set({ rows: { ...snapshot.rows, [row.id]: row } });
    })
    .subscribe((status) => {
      if (gen !== generation) return;
      if (status === "SUBSCRIBED") {
        set({ status: "live" });
        void refresh(gen); // catch up on anything missed while connecting
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        set({ status: "polling" });
      }
    });
}

async function start() {
  if (running || !liveConfigured) return;
  running = true;
  const gen = ++generation;
  set({ status: realtimeCount > 0 ? "connecting" : "polling" });

  document.addEventListener("visibilitychange", onVisible);
  await refresh(gen);
  if (gen !== generation) return;
  schedulePoll(gen);
  await syncChannel(gen);
}

function stop() {
  if (!running) return;
  running = false;
  generation += 1;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
  document.removeEventListener("visibilitychange", onVisible);
  const old = channel;
  channel = null;
  if (old) void getClient().then((c) => c.removeChannel(old));
  set({ status: "off" });
}

function makeSubscribe(realtime: boolean) {
  return (listener: () => void) => {
    listeners.add(listener);
    if (realtime) realtimeCount += 1;
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (running) void syncChannel(generation);
    else void start();

    return () => {
      listeners.delete(listener);
      if (realtime) realtimeCount -= 1;
      if (running) void syncChannel(generation);
      if (listeners.size === 0) {
        // Wait a moment: moving between pages unsubscribes and resubscribes straight away.
        stopTimer = setTimeout(stop, 1500);
      }
    };
  };
}

/** For pages where people watch a match: scores are pushed the moment they change. */
export const subscribeRealtime = makeSubscribe(true);
/** For pages that only glance at the scores (home page): checks every 20 seconds, no live connection. */
export const subscribePolling = makeSubscribe(false);

/* ------------------------------------------------------------------ writing */

/** Shows a change straight away (the scorer's screen); the real row arrives a moment later. */
export function applyLocal(id: string, state: LiveState) {
  const previous = snapshot.rows[id];
  const row: LiveRow = { ...state, id, updated_at: previous?.updated_at ?? new Date().toISOString() };
  set({ rows: { ...snapshot.rows, [id]: row } });
}

let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Saves a match's state with the scorer's login (the database refuses a wrong one). Saves go
 * one after another, in the order they were made, so quick taps can never arrive out of order.
 * Returns an error message, or null when it worked.
 */
export function saveMatch(id: string, state: LiveState, login: ScorerLogin): Promise<string | null> {
  saving.set(id, (saving.get(id) ?? 0) + 1);
  const job = writeChain.then(async () => {
    try {
      const client = await getClient();
      const { error } = await client.rpc("live_save", {
        p_user: login.user,
        p_password: login.password,
        p_id: id,
        p_status: state.status,
        p_period: state.period,
        p_period_started_at: state.period_started_at,
        p_events: state.events,
        p_points: state.points,
      });
      return error ? error.message : null;
    } catch (e) {
      return e instanceof Error ? e.message : "Could not save.";
    } finally {
      const left = (saving.get(id) ?? 1) - 1;
      if (left <= 0) saving.delete(id);
      else saving.set(id, left);
    }
  });
  writeChain = job;
  return job;
}

/** Makes a sport's squads (team id -> player names) available to every scorer. Returns an error message, or null. */
export async function publishSquads(sport: LiveSport, squads: Squads, login: ScorerLogin): Promise<string | null> {
  try {
    const client = await getClient();
    const { error } = await client.rpc("live_save_squads", { p_user: login.user, p_password: login.password, p_sport: sport, p_squads: squads });
    if (error) return error.message;
    await refresh(generation);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Could not publish the squads.";
  }
}

/** Reads the scores again now (used after a failed save to undo the optimistic change). */
export function reloadScores() {
  return refresh(generation);
}
