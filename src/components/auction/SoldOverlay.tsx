"use client";

import { useEffect } from "react";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { formatCompact, formatPrice } from "@/lib/format";
import { playerSubtitle } from "@/lib/sports";
import type { Player, Team } from "@/lib/types";

interface Props {
  player: Player;
  team: Team;
  price: number;
  onClose: () => void;
  /** Auto-dismiss after this many ms. */
  duration?: number;
}

/** Full-screen "SOLD" alert shown on both the admin and the projector screens. */
export function SoldOverlay({ player, team, price, onClose, duration = 9000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, duration]);

  return (
    <div
      role="alertdialog"
      aria-label={`${player.name} sold to ${team.name} for ${formatPrice(price)}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-950 p-6 text-center text-white"
    >
      <div aria-hidden className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-amber-400/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-accent/30 blur-3xl" />

      <p className="relative animate-bounce font-display text-[clamp(4rem,16vw,12rem)] font-extrabold uppercase leading-none tracking-widest text-amber-300 drop-shadow-[0_6px_0_rgba(0,0,0,0.35)]">
        Sold!
      </p>

      <div className="relative flex flex-col items-center gap-6 md:flex-row md:gap-10">
        <div className="relative h-[clamp(10rem,30vh,20rem)] w-[clamp(8rem,24vh,16rem)] overflow-hidden rounded-3xl border-4 border-white/80 bg-white/10 shadow-2xl">
          <PlayerAvatar name={player.name} src={player.photo_url} sizes="320px" priority />
        </div>

        <div className="text-center md:text-left">
          <p className="font-display text-[clamp(2.2rem,6vw,5rem)] font-extrabold uppercase leading-none">{player.name}</p>
          <p className="mt-1 text-lg text-indigo-200">{playerSubtitle(player)}</p>

          <div className="mt-5 flex items-center justify-center gap-4 md:justify-start">
            <div className="relative h-[clamp(4rem,10vh,7rem)] w-[clamp(4rem,10vh,7rem)] shrink-0 overflow-hidden rounded-2xl border-2 border-white/70 bg-white/10">
              <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="112px" className="text-3xl" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-indigo-200">Bought by</p>
              <p className="font-display text-[clamp(1.8rem,4.5vw,3.5rem)] font-bold uppercase leading-none">{team.name}</p>
            </div>
          </div>

          <p className="mt-5 font-display text-[clamp(3.5rem,11vw,9rem)] font-extrabold leading-none text-amber-300">
            {formatCompact(price)}
          </p>
          <p className="text-lg text-indigo-200">{formatPrice(price)}</p>
        </div>
      </div>

      <p className="relative mt-4 text-sm text-indigo-300">Tap anywhere to close</p>
    </div>
  );
}
