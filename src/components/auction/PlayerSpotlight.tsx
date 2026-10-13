"use client";

import { useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { SkillBar } from "@/components/ui/SkillBar";
import { checkTeamBid } from "@/lib/auction";
import { cn, formatCompact, formatPrice } from "@/lib/format";
import type { SportConfig, WheelPool } from "@/lib/sports";
import type { Player, Team } from "@/lib/types";

const LAKH = 100_000;

interface Props {
  player: Player;
  config: SportConfig;
  /** The wheel the player came from (cricket), if any. */
  pool?: WheelPool;
  basePrice: number;
  teams: Team[];
  squadSize: number;
  boughtCount: (teamId: number) => number;
  /** Control screen shows the team / bidding buttons; the projector just shows the player. */
  admin: boolean;
  busy: boolean;
  onAssign: (teamId: number, price: number) => void;
  onStartBidding: () => void;
  onSkip: () => void;
}

/** Full-screen card for the player the wheel just landed on: photo left, details right. */
export function PlayerSpotlight(props: Props) {
  const { player, config, pool, basePrice, teams, squadSize, boughtCount, admin, busy, onAssign, onStartBidding, onSkip } = props;
  const [priceLakh, setPriceLakh] = useState(String(basePrice / LAKH));
  const price = Math.round(Number(priceLakh) * LAKH);
  const priceOk = Number.isFinite(price) && price >= basePrice;

  // Everything we know about the player, shown only when it is filled in.
  const facts: { label: string; value: string }[] = [
    { label: "Sport", value: `${config.emoji} ${config.name}` },
    { label: config.roleLabel, value: player.role_or_position },
    ...config.attributes.map((a) => ({ label: a.label, value: player.attributes?.[a.key] ?? "" })),
    // Text details not described in the sport config are still shown.
    ...Object.entries(player.attributes ?? {})
      .filter(([key]) => !config.attributes.some((a) => a.key === key))
      .map(([key, value]) => ({ label: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), value })),
    { label: "Batch", value: player.batch },
    ...(pool ? [{ label: "Wheel", value: `${pool.emoji} ${pool.label}` }] : []),
  ].filter((f) => f.value);
  const skills = config.skills.filter((s) => player.skills?.[s.key] !== undefined);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-name"
      className="fixed inset-0 z-50 grid animate-[reveal_0.4s_ease-out] grid-rows-[38vh_1fr] bg-background lg:grid-cols-2 lg:grid-rows-1"
    >
      {/* Left: photo */}
      <div className="relative min-h-0 overflow-hidden bg-border">
        <PlayerAvatar name={player.name} src={player.photo_url} sizes="(min-width: 1024px) 50vw, 100vw" priority className="text-[12vw]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-accent px-4 py-1.5 text-sm font-extrabold uppercase tracking-widest text-slate-900 shadow-lg 2xl:text-lg">
          On the block
        </span>
      </div>

      {/* Right: details and actions */}
      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5 sm:p-8 2xl:gap-7 2xl:p-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent 2xl:text-lg">
            {config.emoji} {config.name}
            {pool ? ` · ${pool.label} wheel` : ""}
          </p>
          <h2 id="spotlight-name" className="mt-1 break-words font-display text-[clamp(2.6rem,5.5vw,5.5rem)] font-extrabold uppercase leading-[0.95]">
            {player.name}
          </h2>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0 rounded-xl bg-accent/10 px-4 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted 2xl:text-sm">{f.label}</dt>
              <dd className="break-words font-display text-xl font-bold leading-tight 2xl:text-3xl">{f.value}</dd>
            </div>
          ))}
        </dl>

        {skills.length > 0 && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-3">
            {skills.map((s) => (
              <SkillBar key={s.key} label={s.label} value={player.skills[s.key]} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-accent/15 px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted 2xl:text-base">Base price</span>
          <span className="font-display text-4xl font-extrabold leading-none 2xl:text-6xl">
            {formatCompact(basePrice)} <span className="text-base font-semibold text-muted">{formatPrice(basePrice)}</span>
          </span>
        </div>

        {admin ? (
          <>
            {/* Option 1: put the player straight into a team */}
            <section aria-labelledby="assign-heading" className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h3 id="assign-heading" className="font-display text-2xl font-bold uppercase 2xl:text-3xl">Assign to a team</h3>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Price (₹ lakh)</span>
                  <input
                    type="number"
                    min={basePrice / LAKH}
                    step={0.5}
                    value={priceLakh}
                    onChange={(e) => setPriceLakh(e.target.value)}
                    className="input min-h-[40px] w-24 py-1 text-right font-bold"
                  />
                  <span className="w-24 font-semibold">{priceOk ? formatPrice(price) : "—"}</span>
                </label>
              </div>
              {!priceOk && <p className="text-sm text-amber-600 dark:text-amber-400">The price must be at least the base price ({formatCompact(basePrice)}).</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((team) => {
                  const bought = boughtCount(team.id);
                  const check = checkTeamBid({ team, bought, squadSize, amount: price, basePrice, isHighest: false });
                  const ok = priceOk && check.ok;
                  return (
                    <div key={team.id}>
                      <button
                        type="button"
                        disabled={busy || !ok}
                        onClick={() => onAssign(team.id, price)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition",
                          ok ? "border-primary/50 bg-surface hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10" : "cursor-not-allowed border-border opacity-50",
                        )}
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                          <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="56px" className="text-lg" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-xl font-bold uppercase leading-tight">{team.name}</p>
                          <p className="text-xs text-muted">
                            Purse {formatCompact(team.remaining_purse)} · {bought}/{squadSize} players
                          </p>
                        </div>
                      </button>
                      {priceOk && !check.ok && <p className="mt-1 px-1 text-xs text-amber-600 dark:text-amber-400">{check.reason}</p>}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Option 2: run the bidding, or skip */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={busy} onClick={onStartBidding} className="btn-primary min-h-[60px] text-lg">
                Start Bidding <Kbd>Space</Kbd>
              </button>
              <button type="button" disabled={busy} onClick={onSkip} className="btn-danger min-h-[60px] text-lg">
                Skip – Unsold <Kbd>N</Kbd>
              </button>
            </div>
          </>
        ) : (
          <p className="text-center font-display text-3xl font-bold uppercase text-accent 2xl:text-5xl">Which team will it be?</p>
        )}
      </div>
    </div>
  );
}
