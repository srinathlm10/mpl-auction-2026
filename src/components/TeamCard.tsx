import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { formatPrice } from "@/lib/format";
import type { TeamWithPlayers } from "@/lib/types";

export function TeamCard({ team }: { team: TeamWithPlayers }) {
  const spentPct = team.total_purse > 0 ? Math.min(100, ((team.total_purse - team.remaining_purse) / team.total_purse) * 100) : 0;

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-border">
          <PlayerAvatar name={team.name} src={team.logo_url} sizes="64px" className="text-2xl" />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-2xl font-bold leading-tight">{team.name}</h3>
          <p className="text-sm text-muted">
            Captain: <span className="font-semibold text-foreground">{team.captain || "TBA"}</span>
          </p>
        </div>
      </div>

      <div className="border-b border-border p-4">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="text-muted">Remaining purse</span>
          <span className="font-display text-xl font-bold">{formatPrice(team.remaining_purse)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${100 - spentPct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">of {formatPrice(team.total_purse)} total</p>
      </div>

      <div className="flex-1 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Players bought ({team.players.length})
        </h4>
        {team.players.length === 0 ? (
          <p className="text-sm text-muted">No players yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {team.players.map((player) => (
              <li key={player.id}>
                <Link href={`/players/${player.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{player.name}</span>
                    <span className="block truncate text-xs text-muted">{player.role_or_position}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatPrice(player.sold_price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
