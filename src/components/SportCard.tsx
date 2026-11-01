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
      <div className="bg-banner relative flex h-28 items-end justify-between overflow-hidden p-5 sm:h-32">
        <span aria-hidden className="absolute -right-3 -top-3 text-[5.5rem] leading-none drop-shadow-xl transition duration-300 group-hover:rotate-6 group-hover:scale-105 lg:-top-4 lg:text-[7rem]">
          {config.emoji}
        </span>
        <h3 className="relative z-10 font-display text-3xl font-extrabold uppercase leading-none text-white lg:text-4xl">{config.name}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {config.tagline && <p className="text-sm text-muted">{config.tagline}</p>}
        <div className="mt-auto flex items-center justify-between gap-3">
          <dl className="flex gap-6">
            <div>
              <dt className="caption">Players</dt>
              <dd className="font-display text-2xl font-bold leading-tight">{playerCount}</dd>
            </div>
            <div>
              <dt className="caption">Teams</dt>
              <dd className="font-display text-2xl font-bold leading-tight">{teamCount}</dd>
            </div>
          </dl>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent-strong transition group-hover:bg-accent group-hover:text-white">
            <Icon name="arrowRight" />
          </span>
        </div>
      </div>
    </Link>
  );
}
