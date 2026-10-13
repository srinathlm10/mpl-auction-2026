import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { formatCompact, formatPrice } from "@/lib/format";
import type { TeamWithPlayers } from "@/lib/types";

export function TeamCard({ team, squadSize }: { team: TeamWithPlayers; squadSize?: number }) {
  const leftPct = team.total_purse > 0 ? Math.max(0, Math.min(100, (team.remaining_purse / team.total_purse) * 100)) : 0;
  const filled = squadSize ? Math.min(team.players.length, squadSize) : team.players.length;

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative flex items-center gap-4 overflow-hidden bg-gradient-to-br from-accent/20 to-transparent p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-border">
          <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="64px" className="text-2xl" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold uppercase leading-[1.05]">
            <Link href={`/teams/${team.id}`} className="hover:text-primary">{team.name}</Link>
          </h3>
          <p className="text-xs text-muted">
            Captain <span className="font-semibold text-foreground">{team.captain || "TBA"}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3 border-y border-border p-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Purse left</span>
            <span className="font-display text-2xl font-bold leading-none" title={formatPrice(team.remaining_purse)}>
              {formatCompact(team.remaining_purse)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border" aria-hidden>
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${leftPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">of {formatCompact(team.total_purse)}</p>
        </div>
        {squadSize ? (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              <span>Squad</span>
              <span className="font-display text-base text-foreground">{team.players.length}/{squadSize}</span>
            </div>
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: squadSize }, (_, i) => (
                <span key={i} className={i < filled ? "h-1.5 flex-1 rounded-full bg-primary" : "h-1.5 flex-1 rounded-full bg-border"} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {team.players.length === 0 ? (
          <p className="text-sm text-muted">No players bought yet.</p>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {team.players.map((player) => (
              <li key={player.id}>
                <Link href={`/players/${player.id}`} className="flex items-center justify-between gap-3 py-2 text-sm transition hover:text-primary">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{player.name}</span>
                    <span className="block truncate text-xs text-muted">{player.role_or_position}</span>
                  </span>
                  <span className="shrink-0 font-display text-lg font-bold">{formatCompact(player.sold_price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/teams/${team.id}`} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary hover:underline">
          Full squad <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
