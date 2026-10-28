"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GoalBanner, useGoalAlert } from "@/components/live/GoalAlerts";
import { ClockText, ConnectionNote, Digit, SoundToggle, StatusPill, TeamLogo } from "@/components/live/parts";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/format";
import { formatMinute, leader, matchClock, RULES, scorerLines, type EventKind, type Match, type MatchEvent, type ScorerLine, type SetScore, type Side } from "@/lib/live";
import { formatKickoff, sportInfo, teamOf } from "@/lib/live-data";
import { accentStyle } from "@/lib/sports";
import { useLive } from "@/lib/use-live";
import { useLiveSounds } from "@/lib/use-live-sound";
import { useNow } from "@/lib/use-now";

const EVENT_ICON: Record<EventKind, string> = { goal: "⚽", own_goal: "⚽", yellow: "🟨", red: "🟥" };
const EVENT_NAME: Record<EventKind, string> = { goal: "Goal", own_goal: "Own goal", yellow: "Yellow card", red: "Red card" };

function TeamSide({ teamId }: { teamId: number }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo teamId={teamId} size="lg" />
      <span className="font-display text-lg font-bold uppercase leading-tight sm:text-2xl">{teamOf(teamId).name}</span>
    </div>
  );
}

/** Goal scorers under a team, like on a score card: "⚽ R. Verma 12', 33'". */
function ScorerList({ lines, align }: { lines: ScorerLine[]; align: "left" | "right" }) {
  if (lines.length === 0) return <ul />;
  return (
    <ul className={cn("space-y-1 text-sm", align === "right" && "text-right")}>
      {lines.map((line) => (
        <li key={`${line.name}-${line.ownGoal}`} className={cn("flex items-baseline gap-1.5", align === "right" && "flex-row-reverse")}>
          <span aria-hidden className="text-xs">⚽</span>
          <span className="min-w-0 break-words leading-tight">
            <span className="font-semibold">{line.name}</span>
            {line.ownGoal && <span className="text-white/75"> (OG)</span>}
            {line.times.length > 0 && <span className="text-white/80"> {line.times.join(", ")}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function EventText({ event, align }: { event: MatchEvent; align: "left" | "right" }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <span aria-hidden className="text-xl">{EVENT_ICON[event.kind]}</span>
      <span className="min-w-0">
        <span className="block break-words font-semibold leading-tight">{event.player || EVENT_NAME[event.kind]}</span>
        {event.player && <span className="block truncate text-xs text-muted">{EVENT_NAME[event.kind]}</span>}
      </span>
    </div>
  );
}

/** Events with the first team's on the left, the second team's on the right and the minute in the middle. */
function Timeline({ match }: { match: Match }) {
  const events = [...match.events].reverse();
  if (events.length === 0) {
    return <p className="card p-5 text-sm text-muted">{match.status === "upcoming" ? "Goals and cards will appear here during the match." : "No goals or cards yet."}</p>;
  }
  return (
    <ol className="card divide-y divide-border">
      {events.map((e) => (
        <li key={e.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-3 sm:p-4">
          <div className="min-w-0">{e.side === "a" && <EventText event={e} align="right" />}</div>
          <span className="min-w-[3.5rem] rounded-full bg-primary/10 px-2 py-1 text-center font-display text-lg font-bold tabular-nums text-primary">
            {formatMinute(e.minute, e.added) || "–"}
          </span>
          <div className="min-w-0">{e.side === "b" && <EventText event={e} align="left" />}</div>
        </li>
      ))}
    </ol>
  );
}

function Squads({ match, names }: { match: Match; names: Record<Side, string[]> }) {
  if (names.a.length === 0 && names.b.length === 0) return null;
  return (
    <section aria-labelledby="squads-heading">
      <h2 id="squads-heading" className="section-title mb-3">Squads</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["a", "b"] as Side[]).map((side) => (
          <div key={side} className="card min-w-0 p-4">
            <p className="mb-2 flex items-center gap-2 font-display text-lg font-bold uppercase">
              <TeamLogo teamId={side === "a" ? match.team_a : match.team_b} size="sm" />
              {teamOf(side === "a" ? match.team_a : match.team_b).name}
            </p>
            {names[side].length === 0 ? (
              <p className="text-sm text-muted">Squad not published yet.</p>
            ) : (
              <ul className="columns-2 gap-4 text-sm [&>li]:truncate [&>li]:py-0.5">
                {names[side].map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SetsTable({ match }: { match: Match }) {
  const v = match.volleyball;
  if (!v || match.status === "upcoming") {
    return <p className="card p-5 text-sm text-muted">Set scores will appear here during the match.</p>;
  }
  const cell = (side: Side, set: SetScore) =>
    cn("p-3 text-center font-display text-2xl font-bold tabular-nums", set.winner === side ? "text-foreground" : "text-muted");
  const rules = RULES.volleyball;
  return (
    <div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="p-3">Set</th>
              <th className="p-3 text-center">{teamOf(match.team_a).name}</th>
              <th className="p-3 text-center">{teamOf(match.team_b).name}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {v.sets.map((set, i) => (
              <tr key={i} className={cn(!set.done && "bg-accent/10")}>
                <td className="p-3 font-semibold">
                  Set {i + 1}
                  {!set.done && <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">In play</span>}
                </td>
                <td className={cell("a", set)}><Digit value={set.a} /></td>
                <td className={cell("b", set)}><Digit value={set.b} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Best of {rules.bestOf} sets · first to {rules.setPoints} points ({rules.decidingSetPoints} in a deciding set), win by {rules.winBy}.
      </p>
    </div>
  );
}

export function LiveMatchView({ id }: { id: string }) {
  const { matches, squads, status, loaded, error, configured } = useLive();
  const now = useNow(1000);
  const match = matches.find((m) => m.id === id);
  const mine = useMemo(() => matches.filter((m) => m.id === id), [matches, id]);
  const goal = useGoalAlert(mine, loaded);
  useLiveSounds(mine, loaded);
  if (!match) return null;

  const { name, emoji, config } = sportInfo(match.sport);
  const started = match.status !== "upcoming";
  const clock = matchClock(match, now);
  const flash = !!goal.alert && goal.alert.matchId === match.id && !goal.leaving;
  const v = match.volleyball;
  const winner = leader(match);
  const kickoff = formatKickoff(match.starts_at);

  /* The line under the score: the clock (football), the set in play (volleyball), or who won. */
  let under: React.ReactNode = null;
  if (!started) under = kickoff ?? "Time to be announced";
  else if (match.sport === "football") {
    if (match.status === "finished") under = winner ? `${teamOf(winner === "a" ? match.team_a : match.team_b).name} win` : "Draw";
    else if (clock) {
      under = (
        <span className="inline-flex flex-col items-center leading-none">
          <ClockText text={clock.text} running={clock.running} className="font-display text-4xl font-extrabold sm:text-5xl" />
          {clock.running && <span className="mt-1 text-xs font-bold uppercase tracking-widest text-white/80">{match.period === "2H" ? "2nd half" : "1st half"}</span>}
        </span>
      );
    }
  } else if (v) {
    if (v.finished && v.winner) under = `${teamOf(v.winner === "a" ? match.team_a : match.team_b).name} win ${v.won.a}–${v.won.b}`;
    else if (v.current) under = <>Set {v.sets.length} · <Digit value={v.current.a} /> – <Digit value={v.current.b} /></>;
  }

  const squadNames: Record<Side, string[]> = {
    a: [...(squads[match.team_a] ?? [])].sort((x, y) => x.localeCompare(y)),
    b: [...(squads[match.team_b] ?? [])].sort((x, y) => x.localeCompare(y)),
  };

  return (
    <div style={accentStyle(config)} className="space-y-6">
      <GoalBanner alert={goal.alert} leaving={goal.leaving} burst={goal.burst} onClose={goal.dismiss} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/live" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <Icon name="arrowLeft" className="h-4 w-4" /> All matches
        </Link>
        <SoundToggle />
      </div>

      <section className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent/60 p-5 text-white shadow-lift sm:p-8", flash && "animate-goal-glow")}>
        <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_16px,rgb(255_255_255/0.07)_16px_32px)]" />
        <span aria-hidden className="absolute -right-6 -top-6 text-[8rem] leading-none opacity-25 sm:text-[12rem]">{emoji}</span>
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90 sm:text-sm">
              {name} · {match.round}
            </p>
            <StatusPill match={match} onColor now={now} />
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-6">
            <TeamSide teamId={match.team_a} />
            <div className="text-center">
              <div
                className="font-display text-6xl font-extrabold leading-none tabular-nums [text-shadow:0_2px_12px_rgb(0_0_0/0.3)] sm:text-8xl"
                aria-label={started ? `${match.score.a} to ${match.score.b}` : "Not started"}
              >
                {started ? (
                  <>
                    <Digit value={match.score.a} />
                    <span className="mx-1 text-white/60 sm:mx-2">:</span>
                    <Digit value={match.score.b} />
                  </>
                ) : (
                  <span className="text-white/70">vs</span>
                )}
              </div>
              {under && <div className="mt-3 font-display text-lg font-semibold uppercase tracking-wide sm:text-2xl">{under}</div>}
            </div>
            <TeamSide teamId={match.team_b} />
          </div>

          {match.sport === "football" && started && (
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-4 sm:gap-8">
              <ScorerList lines={scorerLines(match.events, "a")} align="left" />
              <ScorerList lines={scorerLines(match.events, "b")} align="right" />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="detail-heading">
        <h2 id="detail-heading" className="section-title mb-3">
          {match.sport === "football" ? "Timeline" : "Sets"}
        </h2>
        {match.sport === "football" ? <Timeline match={match} /> : <SetsTable match={match} />}
      </section>

      <Squads match={match} names={squadNames} />

      {configured ? (
        <ConnectionNote status={status} error={error} loaded={loaded} />
      ) : (
        <p className="text-sm text-muted">Live scores have not been switched on yet. This match will update here once play starts.</p>
      )}
    </div>
  );
}
