"use client";

import { PlayerExplorer } from "@/components/PlayerExplorer";
import { SportTabs } from "@/components/SportTabs";
import { StatCard } from "@/components/ui/StatCard";
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

      <header className="mb-6 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-4xl" aria-hidden>
          {config.emoji}
        </span>
        <div>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide sm:text-5xl">{sport.name}</h1>
          {config.tagline && <p className="text-muted">{config.tagline}</p>}
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Players" value={players.length} />
        <StatCard label="Available" value={count("available")} />
        <StatCard label="Sold" value={count("sold")} />
        <StatCard label="Unsold" value={count("unsold")} />
      </div>

      <PlayerExplorer players={players} teamNames={teamNames} roleLabel={config.roleLabel} attributes={config.attributes} />
    </div>
  );
}
