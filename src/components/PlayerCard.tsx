import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCompact } from "@/lib/format";
import { playerSubtitle } from "@/lib/sports";
import type { Player } from "@/lib/types";

interface Props {
  player: Player;
  /** Name of the buying team, shown when the player is sold. */
  teamName?: string;
}

export function PlayerCard({ player, teamName }: Props) {
  const sold = player.status === "sold";

  return (
    <Link href={`/players/${player.id}`} className="card-link group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-border">
        <PlayerAvatar
          name={player.name}
          src={player.photo_url}
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
          className="transition duration-500 group-hover:scale-105"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        <StatusBadge status={player.status} className="absolute left-2 top-2 bg-surface/90 backdrop-blur" />
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 font-display text-xl font-bold uppercase leading-[1.05] sm:text-2xl">{player.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted sm:text-sm">{playerSubtitle(player)}</p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-2.5 text-xs sm:mt-3">
          {sold ? (
            <>
              <span className="min-w-0">
                <span className="block text-muted">Sold to</span>
                <span className="block truncate font-semibold text-accent">{teamName ?? "Team"}</span>
              </span>
              <span className="shrink-0 font-display text-xl font-bold leading-none">{formatCompact(player.sold_price)}</span>
            </>
          ) : (
            <>
              <span className="text-muted">Base price</span>
              <span className="font-display text-xl font-bold leading-none">{formatCompact(player.base_price)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
