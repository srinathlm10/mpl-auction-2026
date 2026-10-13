import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerExplorer } from "@/components/PlayerExplorer";
import { SportTabs } from "@/components/SportTabs";
import { StatCard } from "@/components/ui/StatCard";
import { getPlayers, getSportBySlug, getSports, getTeams } from "@/lib/data";
import { accentStyle, getSportConfig } from "@/lib/sports";

type Props = { params: Promise<{ sport: string }> };

export function generateStaticParams() {
  return getSports().map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport: slug } = await params;
  const sport = getSportBySlug(slug);
  return { title: sport ? `${sport.name} players` : "Sport not found" };
}

export default async function SportPage({ params }: Props) {
  const { sport: slug } = await params;
  const sport = getSportBySlug(slug);
  if (!sport) notFound();

  const config = getSportConfig(sport.slug, sport.name);
  const sports = getSports();
  const players = getPlayers(sport.id);
  const teams = getTeams(sport.id);
  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]));
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

      <PlayerExplorer players={players} teamNames={teamNames} roleLabel={config.roleLabel} />
    </div>
  );
}
