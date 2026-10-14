"use client";

import { PlayerExplorer } from "@/components/PlayerExplorer";
import { SportTabs } from "@/components/SportTabs";
import { accentStyle, getSportConfig } from "@/lib/sports";
import { useAuctionData } from "@/lib/use-auction";

export function SportView({ slug }: { slug: string }) {
  const data = useAuctionData();
  const sports = data.sports;
  const sport = sports.find((s) => s.slug === slug);
  if (!sport) return null;

  const config = getSportConfig(sport.slug, sport.name);
  const players = data.players.filter((p) => p.sport_id === sport.id);
  const teamNames = Object.fromEntries(data.teams.filter((t) => t.sport_id === sport.id).map((t) => [t.id, t.name]));
  const count = (status: string) => players.filter((p) => p.status === status).length;

  return (
    <div style={accentStyle(config)}>
      <SportTabs sports={sports} activeSlug={sport.slug} />

      <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent/60 p-5 text-white shadow-lift sm:p-8">
        <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_16px,rgb(255_255_255/0.07)_16px_32px)]" />
        <span aria-hidden className="absolute -right-6 -top-5 text-[6.5rem] leading-none opacity-90 drop-shadow-xl sm:-right-4 sm:-top-8 sm:text-[12rem]">
          {config.emoji}
        </span>
        <div className="relative">
          <h1 className="relative font-display text-5xl font-extrabold uppercase leading-none [text-shadow:0_2px_12px_rgb(0_0_0/0.35)] sm:text-7xl">{sport.name}</h1>
          {config.tagline && <p className="mt-1 font-medium text-white/90">{config.tagline}</p>}
          <dl className="mt-6 grid max-w-xl grid-cols-4 gap-2">
            {[
              ["Players", players.length],
              ["Available", count("available")],
              ["Sold", count("sold")],
              ["Unsold", count("unsold")],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl bg-black/15 px-2.5 py-2 backdrop-blur-sm sm:px-3">
                <dt className="truncate text-[9px] font-bold uppercase tracking-wider text-white/80 sm:text-[11px] sm:tracking-[0.14em]">{label}</dt>
                <dd className="font-display text-2xl font-bold leading-tight sm:text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <PlayerExplorer players={players} teamNames={teamNames} roleLabel={config.roleLabel} attributes={config.attributes} />
    </div>
  );
}
