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

      <header className="bg-banner relative mb-6 overflow-hidden rounded-2xl p-5 text-white shadow-lift sm:p-8">
        <span aria-hidden className="absolute -right-6 -top-5 text-[6.5rem] leading-none drop-shadow-xl sm:-right-4 sm:-top-8 sm:text-[12rem]">
          {config.emoji}
        </span>
        <div className="relative">
          <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-7xl">{sport.name}</h1>
          {config.tagline && <p className="mt-1 pr-20 text-sm font-medium text-white/90 sm:pr-0 sm:text-base">{config.tagline}</p>}
          <dl className="mt-5 grid max-w-sm grid-cols-3 gap-2">
            {[
              ["Players", players.length],
              ["Sold", count("sold")],
              ["Unsold", count("unsold")],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl bg-black/25 px-2 py-2 sm:px-3">
                <dt className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/85 sm:text-[11px]">{label}</dt>
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
