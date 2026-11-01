import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { formatCompact, formatPrice } from "@/lib/format";
import type { TeamWithPlayers } from "@/lib/types";

export function TeamCard({ team, squadSize }: { team: TeamWithPlayers; squadSize?: number }) {
  const leftPct = team.total_purse > 0 ? Math.max(0, Math.min(100, (team.remaining_purse / team.total_purse) * 100)) : 0;
  const filled = squadSize ? Math.min(team.players.length, squadSize) : team.players.length;

  return (
    <article className="card flex flex-col">
      {/* Tall enough for a two-line team name, so the cards in a row stay level. */}
      <div className="flex items-center gap-3 p-4 sm:min-h-[6.25rem]">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-border">
          <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="56px" className="text-xl" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold uppercase leading-[1.05]">
            <Link href={`/teams/${team.id}`} className="hover:text-primary">{team.name}</Link>
          </h3>
          <p className="truncate text-xs text-muted">
            Captain <span className="font-semibold text-foreground">{team.captain || "TBA"}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <p className="caption">Purse left</p>
          <p className="mt-0.5 whitespace-nowrap font-display text-2xl font-bold leading-tight" title={`${formatPrice(team.remaining_purse)} of ${formatPrice(team.total_purse)}`}>
            {formatCompact(team.remaining_purse)}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${leftPct}%` }} />
          </div>
        </div>
        {squadSize ? (
          <div className="min-w-0">
            <p className="caption">Squad</p>
            <p className="mt-0.5 font-display text-2xl font-bold leading-tight">
              {team.players.length}
              <span className="ml-1 text-sm font-semibold text-muted">/ {squadSize}</span>
            </p>
            <div className="mt-1.5 flex gap-0.5" aria-hidden>
              {Array.from({ length: squadSize }, (_, i) => (
                <span key={i} className={i < filled ? "h-1.5 flex-1 rounded-full bg-primary" : "h-1.5 flex-1 rounded-full bg-border"} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {team.players.length > 0 && (
        <ul className="divide-y divide-border border-t border-border px-4">
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

      <Link
        href={`/teams/${team.id}`}
        className="mt-auto flex items-center justify-between gap-1 rounded-b-2xl border-t border-border px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
      >
        {team.players.length > 0 ? "Full squad" : "View team"}
        <Icon name="arrowRight" className="h-4 w-4" />
      </Link>
    </article>
  );
}
