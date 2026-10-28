/*
 * Live scores: types and rules, shared by the public pages and the scorer's console.
 * Everything here is pure (no React, no network) and has no imports, so it is easy to test.
 *
 * What is stored for a match is only a LOG of what happened:
 *   - football: the list of events (goals, own goals, cards), plus status / half / when the half kicked off
 *   - volleyball: every rally, as a string of "a" and "b" (who won the point)
 * The score and the match clock are always worked out from that log, so they can never disagree with it
 * and "Undo" is simply removing the last entry.
 */

export type LiveSport = "football" | "volleyball";
export type MatchStatus = "upcoming" | "live" | "break" | "finished";
export type Side = "a" | "b";
export type Period = "1H" | "2H";

export const LIVE_SPORTS: LiveSport[] = ["football", "volleyball"];

/** Change these to change the rules (the length of a football half can also be set per match in fixtures.json). */
export const RULES = {
  football: { halfMinutes: 20 },
  volleyball: { bestOf: 3, setPoints: 25, decidingSetPoints: 15, winBy: 2 },
};

export interface VolleyballRules {
  bestOf: number;
  setPoints: number;
  decidingSetPoints: number;
  winBy: number;
}

/** A match as planned (src/data/fixtures.json). Team ids are the ids in teams.json. */
export interface Fixture {
  id: string;
  sport: LiveSport;
  round: string;
  team_a: number;
  team_b: number;
  /** ISO time with offset, e.g. "2026-11-14T16:00:00+05:30". Optional. */
  starts_at?: string;
  /** Football only: minutes in each half for this match (default RULES.football.halfMinutes). */
  half_minutes?: number;
}

export type EventKind = "goal" | "own_goal" | "yellow" | "red";

export interface MatchEvent {
  id: string;
  kind: EventKind;
  /** The team the event is for: for an own goal, the team that GETS the goal. */
  side: Side;
  /** Match minute (45 for "45+2'"). */
  minute: number | null;
  /** Stoppage-time minutes (2 for "45+2'"). */
  added: number | null;
  player: string;
}

/** What the database keeps for a match (table live_matches). */
export interface LiveState {
  status: MatchStatus;
  period: Period | null;
  /** When the current half kicked off (server time); the match clock counts from here. */
  period_started_at: string | null;
  events: MatchEvent[];
  /** Volleyball: one letter per rally, "a" or "b" for the team that won it. */
  points: string;
}

export interface LiveRow extends LiveState {
  id: string;
  updated_at: string;
}

export const emptyState = (): LiveState => ({ status: "upcoming", period: null, period_started_at: null, events: [], points: "" });

/** Players of each team, by team id (published from the auction results). */
export type Squads = Record<number, string[]>;

/* ------------------------------------------------------------------ volleyball */

export interface SetScore {
  a: number;
  b: number;
  done: boolean;
  winner: Side | null;
}

export interface VolleyballScore {
  /** Finished sets, then the set in play (when the match is not over). */
  sets: SetScore[];
  /** Sets won by each side. */
  won: { a: number; b: number };
  finished: boolean;
  winner: Side | null;
  current: SetScore | null;
}

/** Works out sets from the rally log. A set is won at the target points with a lead of `winBy`; the last possible set is shorter. */
export function volleyballScore(points: string, rules: VolleyballRules = RULES.volleyball): VolleyballScore {
  const need = Math.floor(rules.bestOf / 2) + 1;
  const sets: SetScore[] = [];
  const won = { a: 0, b: 0 };
  let cur = { a: 0, b: 0 };
  let winner: Side | null = null;

  for (const ch of points) {
    if (winner) break; // anything after the match is over is ignored
    if (ch !== "a" && ch !== "b") continue;
    cur[ch] += 1;
    const deciding = won.a === need - 1 && won.b === need - 1;
    const target = deciding ? rules.decidingSetPoints : rules.setPoints;
    if (Math.max(cur.a, cur.b) >= target && Math.abs(cur.a - cur.b) >= rules.winBy) {
      const setWinner: Side = cur.a > cur.b ? "a" : "b";
      sets.push({ ...cur, done: true, winner: setWinner });
      won[setWinner] += 1;
      cur = { a: 0, b: 0 };
      if (won[setWinner] >= need) winner = setWinner;
    }
  }

  const current: SetScore | null = winner ? null : { ...cur, done: false, winner: null };
  if (current) sets.push(current);
  return { sets, won, finished: winner !== null, winner, current };
}

/* -------------------------------------------------------------------- football */

export function footballScore(events: MatchEvent[]): { a: number; b: number } {
  const score = { a: 0, b: 0 };
  for (const e of events) if (e.kind === "goal" || e.kind === "own_goal") score[e.side] += 1;
  return score;
}

export interface MatchMinute {
  minute: number | null;
  added: number | null;
}

/** "34'" or "45+2'" ("" when there is no minute). */
export function formatMinute(minute: number | null, added: number | null = null): string {
  if (minute === null) return "";
  return added ? `${minute}+${added}'` : `${minute}'`;
}

/** Reads what a scorer typed: "34", "45+2", "" (no minute). Undefined when it is not a minute. */
export function parseMinute(text: string): MatchMinute | undefined {
  const t = text.replace(/[\s']/g, "");
  if (t === "") return { minute: null, added: null };
  const m = /^(\d{1,3})(?:\+(\d{1,2}))?$/.exec(t);
  if (!m) return undefined;
  const minute = Number(m[1]);
  if (minute > 200) return undefined;
  return { minute, added: m[2] ? Number(m[2]) : null };
}

export interface FootballClock {
  /** What to show: "34'", "20+2'", "HT" or "FT". */
  text: string;
  running: boolean;
  /** The minute being played (the cap in stoppage time), null at half time / full time. */
  minute: number | null;
  /** Stoppage-time minutes, 0 normally. */
  added: number;
  /** Seconds played in the match so far, for an mm:ss display. */
  playedSeconds: number;
}

export function halfMinutesOf(m: { half_minutes?: number }): number {
  return m.half_minutes && m.half_minutes > 0 ? m.half_minutes : RULES.football.halfMinutes;
}

/**
 * The match clock. It counts from when the half kicked off, so every phone shows the same time without
 * anybody having to keep updating it. Past the end of a half it shows stoppage time ("20+3'").
 */
export function footballClock(state: LiveState, now: Date, halfMinutes: number = RULES.football.halfMinutes): FootballClock | null {
  if (state.status === "upcoming") return null;
  if (state.status === "break") return { text: "HT", running: false, minute: null, added: 0, playedSeconds: halfMinutes * 60 };
  if (state.status === "finished") return { text: "FT", running: false, minute: null, added: 0, playedSeconds: halfMinutes * 120 };
  if (!state.period_started_at) return null;
  const started = Date.parse(state.period_started_at);
  if (Number.isNaN(started)) return null;

  const elapsed = Math.max(0, Math.floor((now.getTime() - started) / 1000));
  const second = state.period === "2H";
  const base = second ? halfMinutes : 0;
  const cap = second ? halfMinutes * 2 : halfMinutes;
  const current = base + Math.floor(elapsed / 60) + 1; // the minute being played; the first minute is 1'
  const minute = Math.min(current, cap);
  const added = Math.max(0, current - cap);
  return { text: formatMinute(minute, added || null), running: true, minute, added, playedSeconds: base * 60 + elapsed };
}

/** "34:12" for the scorer's console. */
export function formatPlayed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** The minute a goal scored right now belongs to (null when no half is running). */
export function guessMinute(state: LiveState, now: Date, halfMinutes: number = RULES.football.halfMinutes): MatchMinute | null {
  const clock = footballClock(state, now, halfMinutes);
  if (!clock || !clock.running) return null;
  return { minute: clock.minute, added: clock.added || null };
}

export interface ScorerLine {
  name: string;
  /** "12'", "45+2'" */
  times: string[];
  ownGoal: boolean;
}

/** Goal scorers of one side, grouped like on a score card: "R. Verma 12', 45+2'". */
export function scorerLines(events: MatchEvent[], side: Side): ScorerLine[] {
  const lines: ScorerLine[] = [];
  for (const e of events) {
    if ((e.kind !== "goal" && e.kind !== "own_goal") || e.side !== side) continue;
    const name = e.player || (e.kind === "own_goal" ? "Own goal" : "Goal");
    const ownGoal = e.kind === "own_goal";
    let line = lines.find((l) => l.name === name && l.ownGoal === ownGoal);
    if (!line) {
      line = { name, times: [], ownGoal };
      lines.push(line);
    }
    const time = formatMinute(e.minute, e.added);
    if (time) line.times.push(time);
  }
  return lines;
}

/* ----------------------------------------------------------------------- moves */
/* Every move takes a state and returns the next one; the console saves the result. */

export function startMatch(sport: LiveSport, state: LiveState, now: Date): LiveState {
  if (sport === "football") return { ...state, status: "live", period: "1H", period_started_at: now.toISOString() };
  return { ...state, status: "live" };
}

export function halfTime(state: LiveState): LiveState {
  return { ...state, status: "break", period: "1H", period_started_at: null };
}

export function secondHalf(state: LiveState, now: Date): LiveState {
  return { ...state, status: "live", period: "2H", period_started_at: now.toISOString() };
}

export function fullTime(state: LiveState): LiveState {
  return { ...state, status: "finished", period_started_at: null };
}

/** Football: take the match back from "finished" (a mistake) into the second half, at the end of normal time. */
export function reopen(state: LiveState, now: Date, halfMinutes: number = RULES.football.halfMinutes): LiveState {
  // Restart the clock at the end of the second half, so it carries on in stoppage time.
  return { ...state, status: "live", period: "2H", period_started_at: new Date(now.getTime() - (halfMinutes - 1) * 60000).toISOString() };
}

/** Moves the running clock forward (positive) or back (negative) by whole minutes, to correct a late or early start. */
export function shiftClock(state: LiveState, minutes: number): LiveState {
  if (state.status !== "live" || !state.period_started_at) return state;
  const started = Date.parse(state.period_started_at);
  if (Number.isNaN(started)) return state;
  return { ...state, period_started_at: new Date(started - minutes * 60000).toISOString() };
}

export function newEventId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function addEvent(state: LiveState, event: Omit<MatchEvent, "id">): LiveState {
  return { ...state, events: [...state.events, { ...event, id: newEventId() }] };
}

export function editEvent(state: LiveState, id: string, patch: Partial<Pick<MatchEvent, "minute" | "added" | "player">>): LiveState {
  return { ...state, events: state.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}

export function removeEvent(state: LiveState, id: string): LiveState {
  return { ...state, events: state.events.filter((e) => e.id !== id) };
}

/** Volleyball: a rally won by `side`. Ignored once the match is over. */
export function addPoint(state: LiveState, side: Side, rules: VolleyballRules = RULES.volleyball): LiveState {
  if (volleyballScore(state.points, rules).finished) return state;
  const points = state.points + side;
  return { ...state, points, status: volleyballScore(points, rules).finished ? "finished" : "live" };
}

/** Takes back the last goal/card (football) or the last point (volleyball). */
export function undo(sport: LiveSport, state: LiveState, rules: VolleyballRules = RULES.volleyball): LiveState {
  if (sport === "football") return { ...state, events: state.events.slice(0, -1) };
  const points = state.points.slice(0, -1);
  const finished = volleyballScore(points, rules).finished;
  return { ...state, points, status: state.status === "upcoming" ? "upcoming" : finished ? "finished" : "live" };
}

/* --------------------------------------------------------------- a match to show */

export interface Match extends Fixture, LiveState {
  /** Goals (football) or sets won (volleyball). */
  score: { a: number; b: number };
  /** Volleyball only. */
  volleyball: VolleyballScore | null;
  updated_at: string | null;
}

/** A fixture with whatever the database says about it (nothing yet = upcoming, 0-0). */
export function buildMatch(fixture: Fixture, row?: LiveRow | null): Match {
  const state: LiveState = row
    ? { status: row.status, period: row.period, period_started_at: row.period_started_at, events: row.events, points: row.points }
    : emptyState();
  const volleyball = fixture.sport === "volleyball" ? volleyballScore(state.points) : null;
  // A volleyball match is over as soon as a team has won enough sets, whatever the stored status says.
  const status: MatchStatus = volleyball?.finished && state.status !== "upcoming" ? "finished" : state.status;
  return {
    ...fixture,
    ...state,
    status,
    score: volleyball ? { ...volleyball.won } : footballScore(state.events),
    volleyball,
    updated_at: row?.updated_at ?? null,
  };
}

export function buildMatches(fixtures: Fixture[], rows: Record<string, LiveRow>): Match[] {
  return fixtures.map((f) => buildMatch(f, rows[f.id]));
}

export const isLive = (m: Pick<Match, "status">) => m.status === "live" || m.status === "break";

/** The football clock of a match (null for volleyball and for matches that have not started). */
export function matchClock(m: Match, now: Date): FootballClock | null {
  return m.sport === "football" ? footballClock(m, now, halfMinutesOf(m)) : null;
}

/** "34'", "Half time", "Full time", "Set 2", "Upcoming" ... */
export function statusLabel(m: Match, now: Date): string {
  if (m.status === "upcoming") return "Upcoming";
  if (m.sport === "football") {
    if (m.status === "break") return "Half time";
    if (m.status === "finished") return "Full time";
    return matchClock(m, now)?.text ?? "1st half";
  }
  if (m.status === "finished") return "Final";
  return `Set ${m.volleyball?.sets.length ?? 1}`;
}

/** The side that is ahead (or won), null when level. */
export function leader(m: Pick<Match, "score">): Side | null {
  if (m.score.a === m.score.b) return null;
  return m.score.a > m.score.b ? "a" : "b";
}

/* ------------------------------------------------------------------ sounds */

export type SoundCue = "kickOff" | "halfTime" | "fullTime" | "goal" | "yellowCard" | "redCard" | "point" | "setWon" | "matchWon";

/** The few numbers that tell us whether something worth a sound happened between two looks at a match. */
export interface MatchSnapshot {
  status: MatchStatus;
  goals: number;
  cards: number;
  lastCard: "yellow" | "red" | null;
  /** Volleyball: rallies played so far. */
  points: number;
  /** Volleyball: sets won by both teams together. */
  sets: number;
}

export function snapshotOfMatch(m: Match): MatchSnapshot {
  const cards = m.events.filter((e) => e.kind === "yellow" || e.kind === "red");
  const lastCard = cards[cards.length - 1]?.kind;
  return {
    status: m.status,
    goals: m.events.filter((e) => e.kind === "goal" || e.kind === "own_goal").length,
    cards: cards.length,
    lastCard: lastCard === "yellow" || lastCard === "red" ? lastCard : null,
    points: m.points.length,
    sets: m.volleyball ? m.volleyball.won.a + m.volleyball.won.b : 0,
  };
}

/** Which sound fits what changed between two looks at the same match (null = nothing worth a sound). */
export function soundCue(sport: LiveSport, before: MatchSnapshot, after: MatchSnapshot): SoundCue | null {
  const playing = (s: MatchStatus) => s === "live" || s === "break";
  if (sport === "football") {
    if (after.goals > before.goals) return "goal";
    if (after.cards > before.cards) return after.lastCard === "red" ? "redCard" : "yellowCard";
    if (before.status === "upcoming" && after.status === "live") return "kickOff";
    if (before.status === "live" && after.status === "break") return "halfTime";
    if (before.status === "break" && after.status === "live") return "kickOff";
    if (playing(before.status) && after.status === "finished") return "fullTime";
    return null;
  }
  if (after.points > before.points) {
    if (after.status === "finished" && before.status !== "finished") return "matchWon";
    return after.sets > before.sets ? "setWon" : "point";
  }
  if (before.status === "upcoming" && after.status === "live") return "kickOff";
  return null;
}

/* ------------------------------------------------------- reading the database */

const STATUSES: MatchStatus[] = ["upcoming", "live", "break", "finished"];
const KINDS: EventKind[] = ["goal", "own_goal", "yellow", "red"];

function normalizeEvent(raw: unknown): MatchEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const e = raw as Record<string, unknown>;
  if (!KINDS.includes(e.kind as EventKind) || (e.side !== "a" && e.side !== "b")) return [];
  const minute = typeof e.minute === "number" && Number.isFinite(e.minute) ? Math.min(200, Math.max(0, Math.round(e.minute))) : null;
  const added = minute !== null && typeof e.added === "number" && Number.isFinite(e.added) && e.added > 0 ? Math.min(30, Math.round(e.added)) : null;
  const player = typeof e.player === "string" ? e.player.trim().slice(0, 60) : "";
  const id = typeof e.id === "string" && e.id ? e.id.slice(0, 24) : newEventId();
  return [{ id, kind: e.kind as EventKind, side: e.side, minute, added, player }];
}

/** The events column, whether it arrives as a list or as JSON text. */
function eventsOf(raw: unknown): unknown[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

/** Turns whatever came back from the database into a safe row, or null when it is not one. */
export function normalizeRow(raw: unknown): LiveRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    status: STATUSES.includes(r.status as MatchStatus) ? (r.status as MatchStatus) : "upcoming",
    period: r.period === "1H" || r.period === "2H" ? r.period : null,
    period_started_at: typeof r.period_started_at === "string" ? r.period_started_at : null,
    events: eventsOf(r.events).flatMap(normalizeEvent),
    points: typeof r.points === "string" ? r.points.replace(/[^ab]/g, "") : "",
    updated_at: typeof r.updated_at === "string" ? r.updated_at : "",
  };
}

/** Squads as stored: { "9": ["Name", ...], "10": [...] } (team id -> player names). Anything else is ignored. */
export function normalizeSquads(raw: unknown): Squads {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const squads: Squads = {};
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    const id = Number(key);
    if (!Number.isInteger(id) || !Array.isArray(list)) continue;
    squads[id] = list
      .filter((n): n is string => typeof n === "string")
      .map((n) => n.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 60);
  }
  return squads;
}
