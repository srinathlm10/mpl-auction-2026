import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPlayers, getSports, getTeam } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { accentStyle, getSportConfig } from "@/lib/sports";

export const revalidate = 15;

type Props = { params: Promise<{ id: string }> };

async function loadTeam(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return undefined;
  return getTeam(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await loadTeam((await params).id);
  return { title: team ? `${team.name} squad` : "Team not found" };
}

export default async function TeamSquadPage({ params }: Props) {
  const team = await loadTeam((await params).id);
  if (!team) notFound();

  const [sports, players] = await Promise.all([getSports(), getPlayers(team.sport_id)]);
  const sport = sports.find((s) => s.id === team.sport_id);
  const config = getSportConfig(sport?.slug ?? "", sport?.name);
  const squad = players.filter((p) => p.team_id === team.id && p.status === "sold");
  const squadSize = sport?.squad_size ?? 0;
  const spent = squad.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);

  return (
    <div style={accentStyle(config)}>
      <Link href="/teams" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-primary">
        ← All teams
      </Link>

      <header className="mb-6 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-border">
          <PlayerAvatar name={team.name} src={team.logo_url} sizes="96px" className="text-4xl" priority />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">{config.emoji} {sport?.name}</p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-tight tracking-wide sm:text-5xl">{team.name}</h1>
          <p className="text-muted">Captain: <span className="font-semibold text-foreground">{team.captain || "TBA"}</span></p>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total purse" value={formatPrice(team.total_purse)} />
        <StatCard label="Spent" value={formatPrice(spent)} />
        <StatCard label="Remaining" value={formatPrice(team.remaining_purse)} />
        <StatCard label="Squad" value={`${squad.length}${squadSize ? ` / ${squadSize}` : ""}`} />
      </div>

      <h2 className="section-title mb-3">Squad</h2>
      {squad.length === 0 ? (
        <p className="card p-8 text-center text-muted">No players bought yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {squad.map((p) => (
            <li key={p.id}>
              <Link href={`/players/${p.id}`} className="card flex items-center gap-3 p-3 transition hover:border-accent">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-border">
                  <PlayerAvatar name={p.name} src={p.photo_url} sizes="56px" className="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-bold leading-tight">{p.name}</p>
                  <p className="truncate text-xs text-muted">{[p.role_or_position, p.batch].filter(Boolean).join(" · ")}</p>
                  <StatusBadge status={p.status} className="mt-1" />
                </div>
                <p className="shrink-0 font-display text-xl font-bold">{formatPrice(p.sold_price)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
