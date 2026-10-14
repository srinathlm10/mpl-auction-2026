import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { accentStyle, type SportConfig } from "@/lib/sports";

interface Props {
  config: SportConfig;
  playerCount: number;
  teamCount: number;
}

/** Large home-page card linking to a sport's player list. */
export function SportCard({ config, playerCount, teamCount }: Props) {
  return (
    <Link
      href={`/sports/${config.slug}`}
      style={accentStyle(config)}
      className="card-link group relative flex flex-col overflow-hidden"
    >
      <div className="relative flex h-32 items-end justify-between overflow-hidden bg-gradient-to-br from-accent/90 to-accent/50 p-5">
        <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(255_255_255/0.08)_14px_28px)]" />
        <span aria-hidden className="absolute -right-4 -top-3 text-[6rem] leading-none lg:-right-3 lg:-top-4 lg:text-[7.5rem] opacity-90 drop-shadow-xl transition duration-300 group-hover:rotate-6 group-hover:scale-105">
          {config.emoji}
        </span>
        <h3 className="relative z-10 font-display text-3xl font-extrabold uppercase leading-none text-white [text-shadow:0_2px_10px_rgb(0_0_0/0.35)] lg:text-4xl">{config.name}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        {config.tagline && <p className="text-sm text-muted">{config.tagline}</p>}
        <div className="mt-auto flex items-center justify-between gap-3">
          <dl className="flex gap-5">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Players</dt>
              <dd className="font-display text-2xl font-bold leading-tight">{playerCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Teams</dt>
              <dd className="font-display text-2xl font-bold leading-tight">{teamCount}</dd>
            </div>
          </dl>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent transition group-hover:bg-accent group-hover:text-white">
            <Icon name="arrowRight" />
          </span>
        </div>
      </div>
    </Link>
  );
}
