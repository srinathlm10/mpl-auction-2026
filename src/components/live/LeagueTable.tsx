import Link from "next/link";
import { TeamLogo } from "@/components/live/parts";
import { cn } from "@/lib/format";
import { leagueTable, RULES, type LiveSport, type Match, type Standing } from "@/lib/live";
import { sportInfo, teamOf } from "@/lib/live-data";
import { accentStyle } from "@/lib/sports";

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const COUNT = "w-5 sm:w-9";
const DIFFERENCE = "w-7 sm:w-11";

interface Column {
  short: string;
  full: string;
  width: string;
  value: (row: Standing) => string | number;
  /** Only where there is room: phones get the same number of columns in both sports. */
  wide?: boolean;
}

const PLAYED: Column = { short: "P", full: "Played", width: COUNT, value: (r) => r.played };
const WON: Column = { short: "W", full: "Won", width: COUNT, value: (r) => r.won };
const LOST: Column = { short: "L", full: "Lost", width: COUNT, value: (r) => r.lost };

const COLUMNS: Record<LiveSport, Column[]> = {
  football: [
    PLAYED,
    WON,
    { short: "D", full: "Drawn", width: COUNT, value: (r) => r.drawn },
    LOST,
    { short: "GD", full: "Goal difference", width: DIFFERENCE, value: (r) => signed(r.difference) },
  ],
  volleyball: [
    PLAYED,
    WON,
    LOST,
    { short: "Sets", full: "Sets won and lost", width: "w-14", value: (r) => `${r.setsWon}–${r.setsLost}`, wide: true },
    { short: "SD", full: "Set difference", width: DIFFERENCE, value: (r) => signed(r.setDifference) },
    { short: "PD", full: "Point difference", width: DIFFERENCE, value: (r) => signed(r.difference) },
  ],
};

/** A sport's league table, with the places that reach the final marked. */
export function LeagueTable({ matches, sport }: { matches: Match[]; sport: LiveSport }) {
  const table = leagueTable(matches, sport);
  if (table.length === 0) return null;
  const { finalists } = RULES[sport];
  const { name, config } = sportInfo(sport);
  const heading = `${sport}-table-heading`;

  return (
    <section aria-labelledby={heading} style={accentStyle(config)}>
      <h2 id={heading} className="section-title">{name} table</h2>
      <p className="mt-1 text-sm text-muted">Top {finalists} go straight to the final. Updates when each match ends.</p>
      <div className="card mt-3 overflow-hidden">
        <table className="w-full table-fixed text-center text-sm">
          <thead className="border-b border-border">
            <tr className="caption">
              <th scope="col" className="w-7 py-2.5 sm:w-8">#</th>
              <th scope="col" className="py-2.5 pl-1 text-left">Team</th>
              {COLUMNS[sport].map((c) => (
                <th key={c.short} scope="col" className={cn("py-2.5", c.width, c.wide && "hidden sm:table-cell")}>
                  <abbr title={c.full} className="no-underline">{c.short}</abbr>
                </th>
              ))}
              <th scope="col" className="w-9 py-2.5 pr-2 sm:w-12 sm:pr-3">Pts</th>
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
                {COLUMNS[sport].map((c) => (
                  <td key={c.short} className={cn("tabular-nums", c.wide && "hidden sm:table-cell")}>{c.value(row)}</td>
                ))}
                <td className="pr-2 font-display text-xl font-extrabold tabular-nums sm:pr-3">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        {COLUMNS[sport].filter((c) => !c.wide).map((c) => `${c.short} ${c.full.toLowerCase()}`).join(" · ")}
      </p>
    </section>
  );
}
