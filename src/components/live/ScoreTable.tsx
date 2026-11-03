"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Digit, summaryLine, TeamLogo } from "@/components/live/parts";
import { cn } from "@/lib/format";
import { isLive, leader, statusLabel, type LiveSport, type Match, type Side } from "@/lib/live";
import { formatKickoff, sportInfo, teamOf } from "@/lib/live-data";
import { accentStyle } from "@/lib/sports";
import { useNow } from "@/lib/use-now";

function TeamCell({ match, side }: { match: Match; side: Side }) {
  const team = teamOf(side === "a" ? match.team_a : match.team_b);
  const winner = leader(match);
  const lost = match.status === "finished" && winner !== null && winner !== side;
  return (
    <td className="px-1 py-2.5">
      <span className={cn("flex items-center gap-2", side === "a" && "flex-row-reverse text-right")}>
        <span className="hidden sm:block">
          <TeamLogo teamId={team.id} size="sm" />
        </span>
        <span className={cn("min-w-0 font-display text-base font-bold uppercase leading-[1.05] sm:text-lg", lost && "text-muted")}>{team.name}</span>
      </span>
    </td>
  );
}

/** Every match of a sport with its score. Each score opens that match. */
export function ScoreTable({ matches, sport }: { matches: Match[]; sport: LiveSport }) {
  const { name, config } = sportInfo(sport);
  const now = useNow(5000);
  const heading = `${sport}-scores-heading`;

  return (
    <section aria-labelledby={heading} style={accentStyle(config)}>
      <h2 id={heading} className="section-title">{name} scores</h2>
      <p className="mt-1 text-sm text-muted">Every match, with its result. Tap a score to open the match.</p>
      <div className="card mt-3 overflow-hidden">
        <table className="w-full table-fixed text-center text-sm">
          <thead className="border-b border-border">
            <tr className="caption">
              <th scope="col" className="w-12 py-2.5 sm:w-14">Match</th>
              <th scope="col" className="py-2.5 pr-1 text-right">Team</th>
              <th scope="col" className="w-[4.75rem] py-2.5 sm:w-28">Score</th>
              <th scope="col" className="py-2.5 pl-1 text-left">Team</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches
              .filter((m) => m.sport === sport)
              .map((m) => {
                const upcoming = m.status === "upcoming";
                const sets = m.sport === "volleyball" && !upcoming ? summaryLine(m) : null;
                return (
                  <tr key={m.id} className={cn(m.stage === "final" && "bg-accent/[0.07]")}>
                    <td className="font-display text-base font-bold text-muted">{m.round.replace("Match ", "")}</td>
                    <TeamCell match={m} side="a" />
                    <td className="px-0.5 py-2.5">
                      <Link href={`/live/${m.id}`} className="block hover:text-primary">
                        <span className="block whitespace-nowrap font-display text-xl font-extrabold leading-none tabular-nums sm:text-2xl">
                          {upcoming ? <span className="text-muted">vs</span> : <><Digit value={m.score.a} /> – <Digit value={m.score.b} /></>}
                        </span>
                        <span className={cn("mt-1 block text-[11px] leading-tight text-muted", isLive(m) && "font-semibold text-red-600 dark:text-red-400")}>
                          {upcoming ? formatKickoff(m.starts_at) ?? "Time TBA" : statusLabel(m, now)}
                        </span>
                        {sets && (
                          <span className="mt-0.5 block text-[11px] leading-tight text-muted">
                            {sets.split(" · ").map((set, i) => (
                              <Fragment key={i}>
                                {i > 0 && " · "}
                                <span className="whitespace-nowrap">{set}</span>
                              </Fragment>
                            ))}
                          </span>
                        )}
                      </Link>
                    </td>
                    <TeamCell match={m} side="b" />
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
