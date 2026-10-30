"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { ConnectionNote, SoundToggle, StatusPill, TeamLogo } from "@/components/live/parts";
import { Icon } from "@/components/ui/Icon";
import { basePlayers, baseSports } from "@/lib/data";
import { cn } from "@/lib/format";
import {
  addEvent,
  addPoint,
  clockOf,
  editEvent,
  emptyState,
  formatMinute,
  formatPlayed,
  fullTime,
  guessMinute,
  halfMinutesOf,
  halfTime,
  isLive,
  LIVE_SPORTS,
  matchClock,
  parseMinute,
  RULES,
  reopen,
  removeEvent,
  secondHalf,
  shiftClock,
  startMatch,
  undo,
  undoStep,
  type EventKind,
  type LiveSport,
  type LiveState,
  type Match,
  type MatchEvent,
  type MatchMinute,
  type Side,
  type Squads,
  type UndoEntry,
} from "@/lib/live";
import { sportInfo, teamOf } from "@/lib/live-data";
import { applyLocal, publishSquads, reloadScores, saveMatch, serverNow, type ScorerLogin } from "@/lib/live-store";
import { accentStyle } from "@/lib/sports";
import { useAuctionData } from "@/lib/use-auction";
import { useLive } from "@/lib/use-live";
import { useLiveSounds } from "@/lib/use-live-sound";
import { useNow } from "@/lib/use-now";
import { useScorer } from "@/lib/use-scorer";

/* ------------------------------------------------------------------ helpers */

const stateOf = (m: Match): LiveState => ({ status: m.status, period: m.period, period_started_at: m.period_started_at, events: m.events, points: m.points });

const byName = (a: string, b: string) => a.localeCompare(b);

/** "34'" -> "34", for the minute box. */
const minuteBox = (m: MatchMinute | null) => (m ? formatMinute(m.minute, m.added).replace(/'/g, "") : "");

function friendly(message: string): string {
  if (/wrong login|permission denied|row-level security/i.test(message)) return "Not saved: the scorer ID or password is no longer valid. Sign out and sign in again.";
  if (/does not exist|schema cache|could not find the function/i.test(message)) return "Not saved: the database is not set up. Run supabase/live-scores.sql first.";
  if (/fetch|network/i.test(message)) return "Not saved: no connection. Check the internet and try again.";
  return `Not saved: ${message}`;
}

/** Every player of a sport, for when a team's squad has not been published yet. */
function playerPool(sport: LiveSport): string[] {
  const sportId = baseSports.find((s) => s.slug === sport)?.id;
  return [...new Set(basePlayers.filter((p) => p.sport_id === sportId).map((p) => p.name))].sort(byName);
}

/** The names to pick from for a team: its published squad, or else every player of the sport. */
function namesFor(squads: Squads, teamId: number, sport: LiveSport): { names: string[]; published: boolean } {
  const squad = squads[teamId];
  if (squad && squad.length > 0) return { names: [...squad].sort(byName), published: true };
  return { names: playerPool(sport), published: false };
}

const MAX_UNDO = 50;

/** What the scorer did on a match, for Undo. Kept for this browser tab, so a reload does not lose it. */
function useUndoHistory(matchId: string) {
  const key = `mpl-undo-${matchId}`;
  const [history, setHistory] = useState<UndoEntry[]>(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      return Array.isArray(saved) ? (saved as UndoEntry[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(history));
    } catch {
      /* private mode etc.: Undo still works until the page is closed */
    }
  }, [key, history]);
  return [history, setHistory] as const;
}

/** A button that needs a second tap within 3 seconds, so a slip cannot delete or reset anything. */
function ConfirmButton({ label, confirmLabel = "Tap again to confirm", onConfirm, className, disabled }: { label: string; confirmLabel?: string; onConfirm: () => void; className?: string; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(armed ? "btn-danger !bg-red-600 !text-white" : "btn-outline", className)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

/* ------------------------------------------------------------ player picker */

const KIND_TITLE: Record<EventKind, (team: string) => string> = {
  goal: (team) => `Who scored for ${team}?`,
  own_goal: (team) => `Own goal for ${team}: who put it in?`,
  yellow: (team) => `Yellow card for ${team}`,
  red: (team) => `Red card for ${team}`,
};
const KIND_ICON: Record<EventKind, string> = { goal: "⚽", own_goal: "⚽", yellow: "🟨", red: "🟥" };

/** A sheet to choose the player (from the right team) and the minute, then record the event. */
function PlayerPicker({
  kind,
  teamId,
  forTeamName,
  names,
  published,
  initialMinute,
  onPick,
  onCancel,
}: {
  kind: EventKind;
  /** The team whose players are listed. */
  teamId: number;
  forTeamName: string;
  names: string[];
  published: boolean;
  initialMinute: string;
  onPick: (player: string, minute: MatchMinute) => void;
  onCancel: () => void;
}) {
  const [minuteText, setMinuteText] = useState(initialMinute);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const shown = names.filter((n) => n.toLowerCase().includes(filter.trim().toLowerCase()));

  function choose(player: string) {
    const minute = parseMinute(minuteText);
    if (!minute) {
      setError("The minute should look like 34 or 45+2.");
      return;
    }
    onPick(player, minute);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={KIND_TITLE[kind](forTeamName)}
        onClick={(e) => e.stopPropagation()}
        className="card flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden !rounded-b-none sm:!rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border p-4">
          <span aria-hidden className="text-3xl">{KIND_ICON[kind]}</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold uppercase leading-tight">{KIND_TITLE[kind](forTeamName)}</h2>
            <p className="text-xs text-muted">
              {published ? `Players of ${teamOf(teamId).name}` : `Squad not published yet: all ${names.length} football players`}
            </p>
          </div>
          <TeamLogo teamId={teamId} size="sm" />
        </div>

        <div className="flex items-end gap-3 border-b border-border p-4">
          <div className="w-28 shrink-0">
            <label className="label" htmlFor="picker-minute">Minute</label>
            <input id="picker-minute" className="input" inputMode="text" placeholder="e.g. 34" value={minuteText} onChange={(e) => { setMinuteText(e.target.value.slice(0, 7)); setError(null); }} />
          </div>
          {names.length > 10 && (
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor="picker-search">Find a player</label>
              <input id="picker-search" className="input" placeholder="Type a name" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
          )}
        </div>
        {error && <p role="alert" className="px-4 pt-3 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto p-4">
          {shown.map((name) => (
            <button key={name} type="button" className="btn-outline !min-h-[52px] !justify-start truncate !px-3 text-left" onClick={() => choose(name)}>
              {name}
            </button>
          ))}
          {shown.length === 0 && <p className="col-span-2 text-sm text-muted">No player matches “{filter}”.</p>}
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <button type="button" className="btn-primary flex-1" onClick={() => choose("")}>Unknown player</button>
          <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- football */

const EVENT_NAME: Record<EventKind, string> = { goal: "Goal", own_goal: "Own goal", yellow: "Yellow card", red: "Red card" };

function EventRow({ match, event, squads, onChange }: { match: Match; event: MatchEvent; squads: Squads; onChange: (next: LiveState) => void }) {
  const state = stateOf(match);
  const [editing, setEditing] = useState(false);
  const [player, setPlayer] = useState(event.player);
  const [minute, setMinute] = useState(minuteBox({ minute: event.minute, added: event.added }));
  const [error, setError] = useState<string | null>(null);

  // An own goal is put in by a player of the OTHER team.
  const playerTeam = event.kind === "own_goal" ? (event.side === "a" ? match.team_b : match.team_a) : event.side === "a" ? match.team_a : match.team_b;
  const { names } = namesFor(squads, playerTeam, "football");
  const creditedTeam = teamOf(event.side === "a" ? match.team_a : match.team_b).name;

  function save() {
    const parsed = parseMinute(minute);
    if (!parsed) return setError("The minute should look like 34 or 45+2.");
    onChange(editEvent(state, event.id, { player, minute: parsed.minute, added: parsed.added }));
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="space-y-2 p-3">
        <p className="text-sm font-semibold">{KIND_ICON[event.kind]} {creditedTeam}</p>
        <div className="flex gap-2">
          <select className="input" value={player} onChange={(e) => setPlayer(e.target.value)} aria-label="Player">
            <option value="">Unknown player</option>
            {names.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            {player && !names.includes(player) && <option value={player}>{player}</option>}
          </select>
          <input className="input !w-24 shrink-0" placeholder="Minute" value={minute} onChange={(e) => { setMinute(e.target.value.slice(0, 7)); setError(null); }} aria-label="Minute" />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={save}>Save</button>
          <button type="button" className="btn-outline" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <span className="w-14 shrink-0 text-right font-display text-lg font-bold tabular-nums text-muted">{formatMinute(event.minute, event.added) || "–"}</span>
      <span aria-hidden className="text-xl">{KIND_ICON[event.kind]}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{event.player || EVENT_NAME[event.kind]}</span>
        <span className="block truncate text-xs text-muted">{event.player ? `${EVENT_NAME[event.kind]} · ` : ""}{creditedTeam}</span>
      </span>
      <button type="button" className="icon-btn !h-10 !w-10" aria-label="Edit player and minute" onClick={() => setEditing(true)}>✎</button>
      <ConfirmButton label="✕" confirmLabel="Delete?" className="!min-h-[40px] !px-3" onConfirm={() => onChange(removeEvent(state, event.id))} />
    </li>
  );
}

function FootballPanel({
  match,
  squads,
  commit,
  history,
  setHistory,
}: {
  match: Match;
  squads: Squads;
  commit: (next: LiveState) => void;
  history: UndoEntry[];
  setHistory: Dispatch<SetStateAction<UndoEntry[]>>;
}) {
  const state = stateOf(match);
  const now = useNow(1000);
  const clock = matchClock(match, now);
  const half = halfMinutesOf(match);
  const playing = match.status === "live" || match.status === "break";
  const [picker, setPicker] = useState<{ kind: EventKind; side: Side; minute: string } | null>(null);

  /** The minute is taken when the button is tapped (the moment of the goal), before the scorer is chosen. */
  function open(kind: EventKind, side: Side) {
    setPicker({ kind, side, minute: minuteBox(guessMinute(state, serverNow(), half)) });
  }

  function record(player: string, minute: MatchMinute) {
    if (!picker) return;
    const next = addEvent(state, { kind: picker.kind, side: picker.side, minute: minute.minute, added: minute.added, player });
    const eventId = next.events[next.events.length - 1].id;
    setHistory((h) => [...h, { kind: "event" as const, eventId }].slice(-MAX_UNDO));
    commit(next);
    setPicker(null);
  }

  /** Changes the clock or the stage of the match, remembering how it was so Undo can put it back. */
  function moveClock(label: string, next: LiveState) {
    setHistory((h) => [...h, { kind: "clock" as const, label, clock: clockOf(state) }].slice(-MAX_UNDO));
    commit(next);
  }

  const undoable = undoStep(state, history);

  function takeBack() {
    if (!undoable) return;
    setHistory(undoable.history);
    commit(undoable.next);
  }

  const step =
    match.status === "upcoming"
      ? { label: "Kick off (1st half)", run: () => moveClock("Kick off", startMatch("football", state, serverNow())) }
      : match.status === "live" && match.period !== "2H"
        ? { label: "Half time", run: () => moveClock("Half time", halfTime(state)) }
        : match.status === "break"
          ? { label: "Start 2nd half", run: () => moveClock("Start 2nd half", secondHalf(state, serverNow())) }
          : match.status === "live"
            ? { label: "Full time", run: () => moveClock("Full time", fullTime(state)) }
            : { label: "Reopen match", run: () => moveClock("Reopen match", reopen(state, serverNow(), half)) };

  const pickerTeamId = picker ? (picker.kind === "own_goal" ? (picker.side === "a" ? match.team_b : match.team_a) : picker.side === "a" ? match.team_a : match.team_b) : null;
  const pickerNames = pickerTeamId !== null ? namesFor(squads, pickerTeamId, "football") : null;

  return (
    <div className="space-y-5">
      <div className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Match clock</p>
          <p className="font-display text-5xl font-extrabold leading-none tabular-nums">{clock?.running ? formatPlayed(clock.playedSeconds) : clock?.text ?? "00:00"}</p>
          <p className="mt-1 text-sm text-muted">
            {clock?.running ? `${clock.text} · ${match.period === "2H" ? "2nd half" : "1st half"} · ${half} min halves` : match.status === "upcoming" ? "Starts when you kick off" : "Stopped"}
          </p>
        </div>
        {match.status === "live" && (
          <div className="flex flex-col gap-2">
            <button type="button" className="btn-outline !min-h-[40px]" onClick={() => moveClock("+1 min", shiftClock(state, 1))} aria-label="Move the clock forward one minute">+1 min</button>
            <button type="button" className="btn-outline !min-h-[40px]" onClick={() => moveClock("−1 min", shiftClock(state, -1))} aria-label="Move the clock back one minute">−1 min</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary flex-1 !min-h-[52px] text-base" onClick={step.run}>{step.label}</button>
        {match.status === "live" && match.period !== "2H" && (
          <ConfirmButton label="End match" confirmLabel="End match now?" className="!min-h-[52px]" onConfirm={() => moveClock("End match", fullTime(state))} />
        )}
      </div>

      <button type="button" className="btn-outline w-full" disabled={!undoable} onClick={takeBack}>
        <span className="truncate">↩ {undoable ? `Undo: ${undoable.label}` : "Nothing to undo"}</span>
      </button>

      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          {(["a", "b"] as Side[]).map((side) => (
            <div key={side} className="space-y-2">
              <p className="truncate text-center font-display text-lg font-bold uppercase">{teamOf(side === "a" ? match.team_a : match.team_b).name}</p>
              <button type="button" disabled={!playing} className="btn-primary w-full !min-h-[68px] text-lg" onClick={() => open("goal", side)}>⚽ Goal</button>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" disabled={!playing} className="btn-outline !px-1" onClick={() => open("yellow", side)} aria-label="Yellow card">🟨</button>
                <button type="button" disabled={!playing} className="btn-outline !px-1" onClick={() => open("red", side)} aria-label="Red card">🟥</button>
                <button type="button" disabled={!playing} className="btn-outline !px-1 text-xs" onClick={() => open("own_goal", side)} aria-label="Own goal, counts for this team">OG</button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">
          Tap <b>Goal</b> the moment it happens: the minute is taken from the clock, then pick the scorer from that team. “OG” is an own goal: the goal counts for the team you tap it under.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-display text-xl font-bold uppercase">Goals &amp; cards</h3>
        {match.events.length === 0 ? (
          <p className="card p-4 text-sm text-muted">Nothing recorded yet.</p>
        ) : (
          <ol className="card divide-y divide-border">
            {[...match.events].reverse().map((e) => (
              <EventRow key={e.id} match={match} event={e} squads={squads} onChange={commit} />
            ))}
          </ol>
        )}
      </div>

      {picker && pickerTeamId !== null && pickerNames && (
        <PlayerPicker
          kind={picker.kind}
          teamId={pickerTeamId}
          forTeamName={teamOf(picker.side === "a" ? match.team_a : match.team_b).name}
          names={pickerNames.names}
          published={pickerNames.published}
          initialMinute={picker.minute}
          onPick={record}
          onCancel={() => setPicker(null)}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- volleyball */

function VolleyballPanel({ match, commit }: { match: Match; commit: (next: LiveState) => void }) {
  const state = stateOf(match);
  const v = match.volleyball;
  const rules = RULES.volleyball;
  const finished = match.status === "finished";

  if (match.status === "upcoming") {
    return (
      <button type="button" className="btn-primary w-full !min-h-[64px] text-lg" onClick={() => commit(startMatch("volleyball", state, serverNow()))}>
        Start match
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {finished && v?.winner && (
        <p className="card bg-primary/10 p-4 text-center font-display text-xl font-bold uppercase">
          {teamOf(v.winner === "a" ? match.team_a : match.team_b).name} win {v.won.a}–{v.won.b}
        </p>
      )}

      {!finished && v?.current && (
        <div className="card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Set {v.sets.length} · first to {v.won.a === 1 && v.won.b === 1 && rules.bestOf === 3 ? rules.decidingSetPoints : rules.setPoints}, win by {rules.winBy}
          </p>
          <p className="mt-1 font-display text-6xl font-extrabold tabular-nums">
            {v.current.a} <span className="text-muted">–</span> {v.current.b}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(["a", "b"] as Side[]).map((side) => (
          <button
            key={side}
            type="button"
            disabled={finished}
            onClick={() => commit(addPoint(state, side))}
            className="btn-primary flex-col !gap-1 !py-4 active:!scale-95"
            style={{ minHeight: 112 }}
          >
            <span className="font-display text-lg font-bold uppercase leading-tight">{teamOf(side === "a" ? match.team_a : match.team_b).name}</span>
            <span className="font-display text-4xl font-extrabold leading-none">+1</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn-outline flex-1" disabled={match.points.length === 0} onClick={() => commit(undo("volleyball", state))}>↩ Undo last point</button>
      </div>

      {v && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-2 text-left">Set</th>
                <th className="p-2">{teamOf(match.team_a).name}</th>
                <th className="p-2">{teamOf(match.team_b).name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-center font-display text-xl font-bold tabular-nums">
              {v.sets.map((s, i) => (
                <tr key={i} className={cn(!s.done && "bg-accent/10")}>
                  <td className="p-2 text-left font-sans text-sm font-semibold">Set {i + 1}{!s.done && " · in play"}</td>
                  <td className={cn("p-2", s.winner === "a" ? "" : "text-muted")}>{s.a}</td>
                  <td className={cn("p-2", s.winner === "b" ? "" : "text-muted")}>{s.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- one match */

function MatchPanel({ match, squads, login, onBack }: { match: Match; squads: Squads; login: ScorerLogin; onBack: () => void }) {
  const { config } = sportInfo(match.sport);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useUndoHistory(match.id);

  async function commit(next: LiveState) {
    applyLocal(match.id, next); // show it straight away
    const error = await saveMatch(match.id, next, login);
    if (error) {
      setMessage(friendly(error));
      await reloadScores(); // put the screen back to what is really saved
    } else setMessage(null);
  }

  const started = match.status !== "upcoming";

  return (
    <div style={accentStyle(config)} className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <Icon name="arrowLeft" className="h-4 w-4" /> All matches
      </button>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-accent/25 to-transparent px-4 py-2.5">
          <span className="eyebrow !text-xs">{match.sport === "football" ? "Football" : "Volleyball"} · {match.round}</span>
          <StatusPill match={match} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
          {(["a", "b"] as Side[]).map((side, i) => (
            <div key={side} className={cn("flex min-w-0 items-center gap-2", i === 0 ? "order-1" : "order-3 flex-row-reverse text-right")}>
              <TeamLogo teamId={side === "a" ? match.team_a : match.team_b} size="sm" />
              <span className="min-w-0 truncate font-display text-base font-bold uppercase leading-tight">{teamOf(side === "a" ? match.team_a : match.team_b).name}</span>
            </div>
          ))}
          <p className="order-2 font-display text-4xl font-extrabold tabular-nums">{started ? `${match.score.a} : ${match.score.b}` : "vs"}</p>
        </div>
      </section>

      {message && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{message}</p>}

      {match.sport === "football" ? <FootballPanel match={match} squads={squads} commit={commit} history={history} setHistory={setHistory} /> : <VolleyballPanel match={match} commit={commit} />}

      <div className="border-t border-border pt-4">
        <ConfirmButton label="Reset this match (clear everything)" confirmLabel="Clear all scores for this match?" className="w-full" disabled={!started} onConfirm={() => { setHistory([]); void commit(emptyState()); }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sign in */

/** The scorer's sign-in: one ID and password (no sign-up). Everyone else just watches, with no login. */
function SignInForm({ onSignIn, notice }: { onSignIn: (user: string, password: string) => Promise<string | null>; notice?: string }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const message = await onSignIn(user, password);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase">Scorer sign-in</h2>
        <p className="mt-1 text-sm text-muted">
          Only the person who updates the scores signs in. To just follow the matches,{" "}
          <Link href="/live" className="font-semibold text-primary hover:underline">open the live scores</Link>: no login needed.
        </p>
      </div>
      {notice && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">{notice}</p>}
      <div>
        <label className="label" htmlFor="scorer-id">ID</label>
        <input id="scorer-id" className="input" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={user} onChange={(e) => setUser(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="scorer-password">Password</label>
        <input id="scorer-password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

/* ------------------------------------------------------------------ squads */

/** Copies the teams' players from this browser's auction results, so every scorer can pick from them. */
function SquadsCard({ squads, login }: { squads: Squads; login: ScorerLogin }) {
  const auction = useAuctionData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const fromAuction = useMemo(
    () =>
      LIVE_SPORTS.map((sport) => {
        const sportId = baseSports.find((s) => s.slug === sport)?.id;
        const teams = auction.teams.filter((t) => t.sport_id === sportId);
        const map: Squads = {};
        for (const t of teams) map[t.id] = auction.players.filter((p) => p.team_id === t.id && p.status === "sold").map((p) => p.name).sort(byName);
        const players = Object.values(map).reduce((n, list) => n + list.length, 0);
        const published = teams.filter((t) => (squads[t.id]?.length ?? 0) > 0).length;
        return { sport, teams: teams.length, map, players, published };
      }),
    [auction, squads],
  );
  const total = fromAuction.reduce((n, s) => n + s.players, 0);

  async function publish() {
    setBusy(true);
    setMessage(null);
    for (const s of fromAuction) {
      if (s.players === 0) continue; // never replace published squads with nothing
      const error = await publishSquads(s.sport, s.map, login);
      if (error) {
        setBusy(false);
        return setMessage({ ok: false, text: friendly(error) });
      }
    }
    setBusy(false);
    setMessage({ ok: true, text: `Published ${total} players. Scorers will now pick from each team's squad.` });
  }

  return (
    <section aria-label="Squads" className="space-y-3">
      <h2 className="section-title">Squads</h2>
      <div className="card space-y-3 p-4 text-sm">
        <ul className="space-y-1">
          {fromAuction.map((s) => (
            <li key={s.sport} className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{sportInfo(s.sport).emoji} {sportInfo(s.sport).name}</span>
              <span className="text-muted">
                {s.published > 0 ? `${s.published} of ${s.teams} teams published` : "not published: scorers pick from all players"}
                {s.players > 0 && ` · ${s.players} bought in this browser`}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted">
          After the auction, open this page on the laptop that ran it and publish, so every scorer can choose goal scorers from the team. Publishing again replaces the squads.
        </p>
        <button type="button" className="btn-primary w-full" disabled={busy || total === 0} onClick={() => void publish()}>
          {busy ? "Publishing…" : total === 0 ? "No auction results in this browser" : `Publish squads (${total} players)`}
        </button>
        {message && <p role="status" className={cn("font-semibold", message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{message.text}</p>}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- console */

export function ScoreConsole() {
  const { matches, squads, status, loaded, error, configured } = useLive();
  const { state: scorer, signIn, signOut, retry } = useScorer();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useLiveSounds(matches, loaded);

  if (!configured) {
    return (
      <div className="card max-w-2xl space-y-3 p-5 text-sm sm:p-6">
        <h2 className="font-display text-2xl font-bold uppercase">Live scoring is not set up yet</h2>
        <p className="text-muted">It needs a free Supabase project (no sign-ups for anyone). Steps (also in the README, “Live scores”):</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>In Supabase, open <b>SQL Editor</b>, paste the file <code>supabase/live-scores.sql</code> and run it. It creates the scorer login.</li>
          <li>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (Netlify → Site configuration → Environment variables, or <code>.env.local</code>) and redeploy.</li>
          <li>Come back to this page and sign in with the scorer ID and password.</li>
        </ol>
      </div>
    );
  }

  if (scorer.phase === "loading") return <p className="text-muted">Checking the sign-in…</p>;
  if (scorer.phase === "signed-out") return <SignInForm onSignIn={signIn} notice={scorer.notice} />;

  if (scorer.phase === "error") {
    return (
      <div className="card mx-auto max-w-xl space-y-3 p-5 text-sm sm:p-6">
        <h2 className="font-display text-2xl font-bold uppercase">Can&apos;t reach the scores</h2>
        <p className="text-muted">Check the internet connection and try again. ({scorer.message})</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={retry}>Try again</button>
          <button type="button" className="btn-outline" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">Signed in as <span className="font-semibold text-foreground">{scorer.login.user}</span></p>
        <div className="flex flex-wrap gap-2">
          <SoundToggle />
          <ConfirmButton label="Sign out" confirmLabel="Sign out on this device?" className="!min-h-[40px]" onConfirm={signOut} />
        </div>
      </div>

      {selected ? (
        <MatchPanel match={selected} squads={squads} login={scorer.login} onBack={() => setSelectedId(null)} />
      ) : (
        <div className="space-y-6">
          {LIVE_SPORTS.map((sport) => {
            const { name, emoji } = sportInfo(sport);
            const list = matches.filter((m) => m.sport === sport);
            return (
              <section key={sport} aria-label={name}>
                <h2 className="section-title mb-3">{emoji} {name}</h2>
                <ul className="space-y-2">
                  {list.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => setSelectedId(m.id)} className={cn("card-link flex w-full items-center gap-3 p-3 text-left", isLive(m) && "ring-2 ring-red-500/40")} style={accentStyle(sportInfo(sport).config)}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{m.round}</span>
                          <span className="block truncate font-display text-lg font-bold uppercase leading-tight">{teamOf(m.team_a).name} vs {teamOf(m.team_b).name}</span>
                        </span>
                        {m.status !== "upcoming" && <span className="font-display text-2xl font-extrabold tabular-nums">{m.score.a}–{m.score.b}</span>}
                        <StatusPill match={m} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <SquadsCard squads={squads} login={scorer.login} />
          <ConnectionNote status={status} error={error} loaded={loaded} />
        </div>
      )}
    </div>
  );
}
