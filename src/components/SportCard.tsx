import Link from "next/link";
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
      className="card group relative flex min-h-[220px] flex-col justify-between overflow-hidden p-6 transition hover:-translate-y-1 hover:border-accent"
    >
      <div
        aria-hidden
        className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-accent/20 blur-2xl transition group-hover:bg-accent/35"
      />
      <div className="relative">
        <span className="text-5xl" aria-hidden>{config.emoji}</span>
        <h3 className="mt-3 font-display text-4xl font-extrabold uppercase tracking-wide">{config.name}</h3>
        {config.tagline && <p className="mt-1 text-sm text-muted">{config.tagline}</p>}
      </div>
      <div className="relative mt-6 flex items-end justify-between">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{playerCount}</span> players ·{" "}
          <span className="font-semibold text-foreground">{teamCount}</span> teams
        </p>
        <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-slate-900 transition group-hover:translate-x-1">
          View →
        </span>
      </div>
    </Link>
  );
}
