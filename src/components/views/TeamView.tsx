"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatCard } from "@/components/ui/StatCard";
import { formatCompact, formatPrice } from "@/lib/format";
import { accentStyle, getSportConfig } from "@/lib/sports";
import { useAuctionData } from "@/lib/use-auction";

export function TeamView({ teamId }: { teamId: number }) {
  const { sports, teams, players } = useAuctionData();
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;

  const sport = sports.find((s) => s.id === team.sport_id);
  const config = getSportConfig(sport?.slug ?? "", sport?.name);
  const squad = players.filter((p) => p.team_id === team.id && p.status === "sold");
  const squadSize = sport?.squad_size ?? 0;
  const spent = squad.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);

  return (
    <div style={accentStyle(config)}>
      <Link href="/teams" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-primary">
        <Icon name="arrowLeft" className="h-4 w-4" />
        All teams
      </Link>

      <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent/60 p-5 text-white shadow-lift sm:p-8">
        <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_16px,rgb(255_255_255/0.07)_16px_32px)]" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-white shadow-lift sm:h-28 sm:w-28">
            <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="112px" className="text-4xl" priority />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">
              <span aria-hidden>{config.emoji}</span> {sport?.name}
            </p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] drop-shadow sm:text-6xl">{team.name}</h1>
            <p className="mt-1 text-sm text-white/85">Captain <span className="font-semibold text-white">{team.captain || "TBA"}</span></p>
          </div>
        </div>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="wallet" label="Total purse" value={formatCompact(team.total_purse)} />
        <StatCard icon="tag" label="Spent" value={formatCompact(spent)} />
        <StatCard icon="wallet" label="Remaining" value={formatCompact(team.remaining_purse)} highlight />
        <StatCard icon="users" label="Squad" value={`${squad.length}${squadSize ? `/${squadSize}` : ""}`} />
      </div>

      <h2 className="section-title mb-4">Squad</h2>
      {squad.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-muted">
          <Icon name="users" className="h-8 w-8" />
          No players bought yet.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {squad.map((p) => (
            <li key={p.id}>
              <Link href={`/players/${p.id}`} className="card-link flex items-center gap-3 p-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-border">
                  <PlayerAvatar name={p.name} src={p.photo_url} sizes="56px" className="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-bold uppercase leading-tight">{p.name}</p>
                  <p className="truncate text-xs text-muted">{[p.role_or_position, p.batch].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="shrink-0 font-display text-2xl font-bold" title={formatPrice(p.sold_price)}>{formatCompact(p.sold_price)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
