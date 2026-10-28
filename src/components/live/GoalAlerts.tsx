"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/auction/Confetti";
import { TeamLogo } from "@/components/live/parts";
import { cn } from "@/lib/format";
import { formatMinute, type Match } from "@/lib/live";
import { teamOf } from "@/lib/live-data";

export interface GoalAlert {
  /** The id of the goal event, so each goal is celebrated once. */
  id: string;
  matchId: string;
  teamId: number;
  scorer: string;
  time: string;
  ownGoal: boolean;
  scoreLine: string;
}

const SHOW_MS = 7000;
const LEAVE_MS = 450;

/**
 * Notices goals that arrive after the page was opened (never the ones already scored) and
 * keeps the latest one around for a few seconds, for the banner and the scoreboard glow.
 */
export function useGoalAlert(matches: Match[], loaded: boolean) {
  const seen = useRef<Set<string> | null>(null);
  const [alert, setAlert] = useState<GoalAlert | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!loaded) return;
    const goals = matches.flatMap((m) => m.events.filter((e) => e.kind === "goal" || e.kind === "own_goal").map((e) => ({ m, e })));
    if (seen.current === null) {
      seen.current = new Set(goals.map((g) => g.e.id)); // the first look is the starting point
      return;
    }
    let fresh: (typeof goals)[number] | null = null;
    for (const g of goals) {
      if (!seen.current.has(g.e.id)) {
        seen.current.add(g.e.id);
        fresh = g;
      }
    }
    if (!fresh) return;
    const { m, e } = fresh;
    setAlert({
      id: e.id,
      matchId: m.id,
      teamId: e.side === "a" ? m.team_a : m.team_b,
      scorer: e.player,
      time: formatMinute(e.minute, e.added),
      ownGoal: e.kind === "own_goal",
      scoreLine: `${teamOf(m.team_a).name} ${m.score.a} – ${m.score.b} ${teamOf(m.team_b).name}`,
    });
    setLeaving(false);
    setBurst((n) => n + 1);
  }, [matches, loaded]);

  useEffect(() => {
    if (!alert) return;
    const leave = setTimeout(() => setLeaving(true), SHOW_MS - LEAVE_MS);
    const done = setTimeout(() => setAlert(null), SHOW_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, [alert]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => setAlert(null), LEAVE_MS);
  }, []);

  return { alert, leaving, burst, dismiss };
}

/** The "GOAL!" banner with confetti. Tap it to dismiss; it also goes away by itself. */
export function GoalBanner({ alert, leaving, burst, onClose }: { alert: GoalAlert | null; leaving: boolean; burst: number; onClose: () => void }) {
  const team = alert ? teamOf(alert.teamId) : null;
  return (
    <>
      <Confetti burst={burst} />
      {alert && team && (
        <div role="status" aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-50 flex justify-center px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Goal. Tap to dismiss."
            className={cn(
              "pointer-events-auto relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-amber-300 via-orange-500 to-red-600 p-1 text-left shadow-2xl",
              leaving ? "animate-goal-out" : "animate-goal-in",
            )}
          >
            <span aria-hidden className="animate-goal-shine absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-md" />
            <span className="relative flex items-center gap-4 rounded-[1.4rem] bg-slate-950/90 p-4 text-white">
              <span aria-hidden className="animate-ball-bounce text-5xl">⚽</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-5xl font-extrabold uppercase leading-none tracking-wide text-amber-300">Goal!</span>
                <span className="mt-1 block truncate font-display text-xl font-bold uppercase">{alert.scorer || team.name}</span>
                <span className="block truncate text-sm text-white/80">
                  {team.name}
                  {alert.time && ` · ${alert.time}`}
                  {alert.ownGoal && " · own goal"}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-amber-200">{alert.scoreLine}</span>
              </span>
              <TeamLogo teamId={alert.teamId} size="md" />
            </span>
          </button>
        </div>
      )}
    </>
  );
}
