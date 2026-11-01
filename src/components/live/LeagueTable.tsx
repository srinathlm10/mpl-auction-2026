import Link from "next/link";
import { TeamLogo } from "@/components/live/parts";
import { cn } from "@/lib/format";
import { leagueTable, RULES, type Match } from "@/lib/live";
import { sportInfo, teamOf } from "@/lib/live-data";
import { accentStyle } from "@/lib/sports";

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** The football league table, with the places that reach the final marked. */
export function LeagueTable({ matches }: { matches: Match[] }) {
  const table = leagueTable(matches);
  if (table.length === 0) return null;
  const { finalists } = RULES.football;

  const columns: [string, string][] = [
    ["P", "Played"],
    ["W", "Won"],
    ["D", "Drawn"],
    ["L", "Lost"],
  ];

  return (
    <section aria-labelledby="league-table-heading" style={accentStyle(sportInfo("football").config)}>
      <h2 id="league-table-heading" className="section-title">Football table</h2>
      <p className="mt-1 text-sm text-muted">Top {finalists} go straight to the final. Updates when each match ends.</p>
      <div className="card mt-3 overflow-hidden">
        <table className="w-full table-fixed text-center text-sm">
          <thead className="border-b border-border">
            <tr className="caption">
              <th scope="col" className="w-8 py-2.5">#</th>
              <th scope="col" className="py-2.5 pl-1 text-left">Team</th>
              {columns.map(([short, full]) => (
                <th key={short} scope="col" className="w-6 py-2.5 sm:w-10" title={full}>
                  <abbr title={full} className="no-underline">{short}</abbr>
                </th>
              ))}
              <th scope="col" className="w-9 py-2.5 sm:w-12" title="Goal difference">
                <abbr title="Goal difference" className="no-underline">GD</abbr>
              </th>
              <th scope="col" className="w-10 py-2.5 pr-2 sm:w-14 sm:pr-3">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {table.map((row, i) => (
              <tr key={row.team} className={cn(i < finalists && "bg-accent/[0.07] shadow-[inset_3px_0_0_rgb(var(--accent))]")}>
                <td className="py-2 font-display text-lg font-bold text-muted">{i + 1}</td>
                <td className="py-2 pl-1 text-left">
                  <Link href={`/teams/${row.team}`} className="flex min-w-0 items-center gap-2 hover:text-primary">
                    <TeamLogo teamId={row.team} size="sm" />
                    <span className="min-w-0 font-display text-base font-bold uppercase leading-[1.05] sm:text-lg">{teamOf(row.team).name}</span>
                  </Link>
                </td>
                <td className="tabular-nums">{row.played}</td>
                <td className="tabular-nums">{row.won}</td>
                <td className="tabular-nums">{row.drawn}</td>
                <td className="tabular-nums">{row.lost}</td>
                <td className="tabular-nums">{signed(row.goalDifference)}</td>
                <td className="pr-2 font-display text-xl font-extrabold tabular-nums sm:pr-3">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
