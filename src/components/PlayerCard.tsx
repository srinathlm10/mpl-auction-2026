import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatPrice } from "@/lib/format";
import type { Player } from "@/lib/types";

interface Props {
  player: Player;
  /** Name of the buying team, shown when the player is sold. */
  teamName?: string;
}

export function PlayerCard({ player, teamName }: Props) {
  const sold = player.status === "sold";

  return (
    <Link
      href={`/players/${player.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-border">
        <PlayerAvatar
          name={player.name}
          src={player.photo_url}
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
          className="transition duration-300 group-hover:scale-105"
        />
        <StatusBadge status={player.status} className="absolute right-2 top-2 bg-surface/90 backdrop-blur" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="line-clamp-1 font-display text-xl font-bold leading-tight">{player.name}</h3>
        <p className="line-clamp-1 text-sm text-muted">
          {[player.role_or_position, player.batch].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto pt-2 text-sm">
          {sold ? (
            <>
              <p className="line-clamp-1 font-semibold text-accent">{teamName ?? "Sold"}</p>
              <p className="text-muted">
                Sold for <span className="font-semibold text-foreground">{formatPrice(player.sold_price)}</span>
              </p>
            </>
          ) : (
            <p className="text-muted">
              Base <span className="font-semibold text-foreground">{formatPrice(player.base_price)}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
