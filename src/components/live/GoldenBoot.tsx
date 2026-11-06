import { TeamLogo } from "@/components/live/parts";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/format";
import { topAssists, topScorers, type Match, type PlayerTally } from "@/lib/live";
import { sportInfo, teamOf } from "@/lib/live-data";
import { accentStyle } from "@/lib/sports";

const SHOWN = 10;

interface Props {
  id: string;
  title: string;
  note: string;
  label: string;
  empty: { title: string; text: string };
  rows: PlayerTally[];
}

function Leaderboard({ id, title, note, label, empty, rows }: Props) {
  const heading = `${id}-heading`;
  const shown = rows.slice(0, SHOWN);

  return (
    <section aria-labelledby={heading} style={accentStyle(sportInfo("football").config)}>
      <h2 id={heading} className="section-title">{title}</h2>
      <p className="mt-1 text-sm text-muted">{note}</p>
      <div className="mt-3">
        {shown.length === 0 ? (
          <EmptyState icon="trophy" title={empty.title} text={empty.text} />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-border">
                <tr className="caption">
                  <th scope="col" className="w-7 py-2.5 text-center sm:w-8">#</th>
                  <th scope="col" className="py-2.5 pl-1 text-left">Player</th>
                  <th scope="col" className="w-16 py-2.5 pr-3 text-right">{label}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((s) => (
                  <tr key={`${s.team}-${s.player}`} className={cn(s.rank === 1 && "bg-gold/10 shadow-[inset_3px_0_0_rgb(var(--gold))]")}>
                    <td className="py-2 text-center font-display text-lg font-bold text-muted">{s.rank}</td>
                    <td className="py-2 pl-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <TeamLogo teamId={s.team} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{s.player}</span>
                          <span className="block truncate text-xs text-muted">{teamOf(s.team).name}</span>
                        </span>
                      </span>
                    </td>
                    <td className="pr-3 text-right font-display text-xl font-extrabold tabular-nums">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/** The race for the Golden Boot: football's top goal scorers, updated the moment a goal is recorded. */
export function GoldenBoot({ matches }: { matches: Match[] }) {
  return (
    <Leaderboard
      id="golden-boot"
      title="Golden Boot"
      note="Football's top goal scorers, final included. Own goals don't count."
      label="Goals"
      empty={{ title: "No goals yet.", text: "The top scorers appear here as soon as goals are recorded." }}
      rows={topScorers(matches)}
    />
  );
}

export function TopAssists({ matches }: { matches: Match[] }) {
  return (
    <Leaderboard
      id="top-assists"
      title="Top assists"
      note="Football's top assist makers, final included."
      label="Assists"
      empty={{ title: "No assists yet.", text: "The top assist makers appear here as soon as assists are recorded." }}
      rows={topAssists(matches)}
    />
  );
}
