"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { squadOf } from "@/lib/auction";
import { formatCompact, formatPrice } from "@/lib/format";
import { accentStyle, getSportConfig } from "@/lib/sports";
import { useAuctionData } from "@/lib/use-auction";

export function TeamView({ teamId }: { teamId: number }) {
  const { sports, teams, players } = useAuctionData();
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;

  const sport = sports.find((s) => s.id === team.sport_id);
  const config = getSportConfig(sport?.slug ?? "", sport?.name);
  const squad = squadOf(players, team.id);
  const spent = squad.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);

  return (
    <div style={accentStyle(config)}>
      <Link href="/teams" className="back-link mb-5">
        <Icon name="arrowLeft" className="h-4 w-4" />
        All teams
      </Link>

      <header className="bg-banner mb-6 rounded-2xl p-5 text-white shadow-lift sm:p-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white shadow-lift sm:h-28 sm:w-28">
            <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="112px" className="text-4xl" priority />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
              <span aria-hidden>{config.emoji}</span> {sport?.name}
            </p>
            <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">{team.name}</h1>
            <p className="mt-1.5 text-sm text-white/85">Captain <span className="font-semibold text-white">{team.captain || "TBA"}</span></p>
          </div>
        </div>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="wallet" label="Total purse" value={formatCompact(team.total_purse)} />
        <StatCard icon="tag" label="Spent" value={formatCompact(spent)} />
        <StatCard icon="wallet" label="Remaining" value={formatCompact(team.remaining_purse)} highlight />
        <StatCard icon="users" label="Squad" value={squad.length} />
      </div>

      <h2 className="section-title mb-4">Squad</h2>
      {squad.length === 0 ? (
        <EmptyState icon="users" title="No players yet." text="This team's squad will be listed here." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {squad.map((p) => (
            <li key={p.id}>
              <Link href={`/players/${p.id}`} className="card-link flex h-full items-center gap-3 p-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-border">
                  <PlayerAvatar name={p.name} src={p.photo_url} sizes="56px" className="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold uppercase leading-tight">{p.name}</p>
                  {p.status === "sold" ? (
                    <p className="truncate text-xs text-muted">{[p.role_or_position, p.batch].filter(Boolean).join(" · ")}</p>
                  ) : (
                    <StatusBadge status={p.status} className="mt-1" />
                  )}
                </div>
                {p.status === "sold" && (
                  <p className="shrink-0 font-display text-2xl font-bold" title={formatPrice(p.sold_price)}>{formatCompact(p.sold_price)}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
