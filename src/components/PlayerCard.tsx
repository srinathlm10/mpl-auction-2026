import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatusBadge, teamLabel } from "@/components/ui/StatusBadge";
import { formatCompact } from "@/lib/format";
import { playerSubtitle } from "@/lib/sports";
import type { Player } from "@/lib/types";

interface Props {
  player: Player;
  /** Name of the player's team, when they have one. */
  teamName?: string;
}

export function PlayerCard({ player, teamName }: Props) {
  const onTeam = teamLabel(player.status);

  return (
    <Link href={`/players/${player.id}`} className="card-link group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-border sm:aspect-[4/5]">
        <PlayerAvatar
          name={player.name}
          src={player.photo_url}
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
          className="transition duration-500 group-hover:scale-105"
        />
        <StatusBadge status={player.status} className="absolute left-2 top-2 bg-surface/90 backdrop-blur" />
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 font-display text-xl font-bold uppercase leading-[1.05] sm:text-2xl">{player.name}</h3>
        <p className="mb-2.5 mt-1 line-clamp-1 text-xs text-muted sm:text-[13px]">{playerSubtitle(player)}</p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-2.5 text-xs">
          {onTeam ? (
            <>
              <span className="min-w-0">
                <span className="block text-muted">{onTeam}</span>
                <span className="block truncate font-semibold text-accent-strong">{teamName ?? "Team"}</span>
              </span>
              {player.status === "sold" && <span className="shrink-0 font-display text-xl font-bold leading-none">{formatCompact(player.sold_price)}</span>}
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
