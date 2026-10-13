"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { SkillBar } from "@/components/ui/SkillBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn, formatCompact, formatPrice } from "@/lib/format";
import { accentStyle, getSportConfig } from "@/lib/sports";
import { useAuctionData } from "@/lib/use-auction";

export function PlayerView({ playerId }: { playerId: number }) {
  const { sports, teams, players } = useAuctionData();
  const player = players.find((p) => p.id === playerId);
  if (!player) return null;

  const sport = sports.find((s) => s.id === player.sport_id);
  const config = getSportConfig(sport?.slug ?? "", sport?.name);
  const team = player.team_id ? teams.find((t) => t.id === player.team_id) : undefined;

  // Known skills first (in config order), then anything extra stored in the JSON.
  const known = config.skills.filter((s) => player.skills[s.key] !== undefined);
  const knownKeys = new Set(known.map((s) => s.key));
  const extra = Object.keys(player.skills)
    .filter((key) => !knownKeys.has(key))
    .map((key) => ({ key, label: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }));
  const skills = [...known, ...extra];

  const facts = [
    { label: config.roleLabel, value: player.role_or_position },
    ...config.attributes.map((attr) => ({ label: attr.label, value: player.attributes?.[attr.key] ?? "" })),
    { label: "Batch", value: player.batch },
  ].filter((f) => f.value);
  const sold = player.status === "sold";

  return (
    <div style={accentStyle(config)}>
      <Link href={sport ? `/sports/${sport.slug}` : "/"} className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-primary">
        <Icon name="arrowLeft" className="h-4 w-4" />
        {sport?.name ?? "Home"} players
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr] md:gap-10 lg:gap-14">
        <div className="relative mx-auto w-full max-w-sm md:max-w-none">
          <div aria-hidden className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-accent/40 to-primary/30 blur-2xl" />
          <div className="card relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-border">
            <PlayerAvatar name={player.name} src={player.photo_url} sizes="(min-width: 768px) 360px, 90vw" priority className="text-[7rem]" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip border-transparent bg-accent/15 uppercase tracking-wide">
              <span aria-hidden>{config.emoji}</span> {sport?.name}
            </span>
            <StatusBadge status={player.status} />
          </div>

          <h1 className="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.92] sm:text-7xl">{player.name}</h1>

          {facts.length > 0 && (
            <dl
              className={cn(
                "mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border",
                facts.length === 1 ? "grid-cols-1" : facts.length === 2 || facts.length === 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
              )}
            >
              {facts.map((f, i) => (
                <div key={f.label} className={cn("bg-surface p-4", facts.length % 2 === 1 && i === facts.length - 1 && "col-span-2 sm:col-span-1")}>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{f.label}</dt>
                  <dd className="mt-1 font-display text-2xl font-bold leading-tight">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div
            className={
              sold
                ? "mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-accent to-accent/70 p-5 text-white shadow-lift"
                : "mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card"
            }
          >
            {sold ? (
              <>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">Sold to</p>
                  <p className="font-display text-3xl font-bold uppercase leading-tight">{team?.name ?? "Team"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">For</p>
                  <p className="font-display text-4xl font-extrabold leading-none">{formatCompact(player.sold_price)}</p>
                  <p className="text-xs text-white/80">{formatPrice(player.sold_price)}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Base price</p>
                  <p className="font-display text-4xl font-extrabold leading-none">{formatCompact(player.base_price)}</p>
                  <p className="text-xs text-muted">{formatPrice(player.base_price)}</p>
                </div>
                <p className="max-w-[16rem] text-sm text-muted">
                  {player.status === "unsold" ? "Went unsold in the first round. May return in the second round." : "Bidding opens at the base price on auction day."}
                </p>
              </>
            )}
          </div>

          {skills.length > 0 && (
            <section className="mt-8" aria-labelledby="skills-heading">
              <h2 id="skills-heading" className="section-title mb-4 text-2xl sm:text-3xl">Key skills</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {skills.map((skill) => (
                  <SkillBar key={skill.key} label={skill.label} value={player.skills[skill.key]} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
