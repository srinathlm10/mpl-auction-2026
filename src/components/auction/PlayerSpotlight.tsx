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

/** Pop-up window (80% of the screen) for the player the wheel just landed on: round photo left, details right. */
export function PlayerSpotlight(props: Props) {
  const { player, config, pool, basePrice, teams, squadSize, boughtCount, admin, busy, onAssign, onStartBidding, onSkip } = props;
  const [priceLakh, setPriceLakh] = useState(String(basePrice / LAKH));
  const price = Math.round(Number(priceLakh) * LAKH);
  const priceOk = Number.isFinite(price) && price >= basePrice;

  // Everything we know about the player, shown only when it is filled in.
  // (Sport and wheel are in the heading line above the name.)
  const facts: { label: string; value: string }[] = [
    { label: config.roleLabel, value: player.role_or_position },
    ...config.attributes.map((a) => ({ label: a.label, value: player.attributes?.[a.key] ?? "" })),
    // Text details not described in the sport config are still shown.
    ...Object.entries(player.attributes ?? {})
      .filter(([key]) => !config.attributes.some((a) => a.key === key))
      .map(([key, value]) => ({ label: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), value })),
    { label: "Batch", value: player.batch },
  ].filter((f) => f.value);
  const skills = config.skills.filter((s) => player.skills?.[s.key] !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-[3vh] backdrop-blur-md sm:p-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-name"
        className="flex h-full w-full animate-[reveal_0.4s_ease-out] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl sm:h-[80vh] sm:w-[80vw] lg:flex-row"
      >
        {/* Left: photo in a circle, base price */}
        <div className="relative flex shrink-0 flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-br from-accent to-accent/60 px-6 pb-6 pt-14 lg:w-[40%] lg:gap-6 lg:py-14">
          <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_18px,rgb(255_255_255/0.07)_18px_36px)]" />
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-900 shadow-lg 2xl:text-base">
            On the block
          </span>
          <div className="relative aspect-square w-36 shrink-0 sm:w-44 lg:w-[min(26vw,46vh)]">
            <div aria-hidden className="absolute -inset-3 rounded-full bg-white/25 blur-xl" />
            <div className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-white bg-border shadow-2xl">
              <PlayerAvatar name={player.name} src={player.photo_url} sizes="(min-width: 1024px) 26vw, 176px" priority className="text-[clamp(2.5rem,7vw,6rem)]" />
            </div>
          </div>
          <div className="relative rounded-2xl bg-black/20 px-5 py-2.5 text-center text-white backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80 2xl:text-sm">Base price</p>
            <p className="font-display text-4xl font-extrabold leading-none 2xl:text-6xl">{formatCompact(basePrice)}</p>
            <p className="text-xs text-white/80 2xl:text-sm">{formatPrice(basePrice)}</p>
          </div>
        </div>

        {/* Right: details and actions */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-7 2xl:gap-6 2xl:p-10 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-accent 2xl:text-lg">
              {config.emoji} {config.name}
              {pool ? ` · ${pool.label} wheel` : ""}
            </p>
            <h2 id="spotlight-name" className="mt-1 break-words font-display text-[clamp(2.2rem,4.2vw,4.75rem)] font-extrabold uppercase leading-[0.95]">
              {player.name}
            </h2>
          </div>

        <dl className={cn("grid grid-cols-2 gap-3", facts.length === 3 && "xl:grid-cols-3")}>
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
                          "flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition",
                          ok ? "border-primary/50 bg-surface hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10" : "cursor-not-allowed border-border opacity-50",
                        )}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                          <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="48px" className="text-lg" />
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
              <button type="button" disabled={busy} onClick={onStartBidding} className="btn-primary min-h-[56px] text-lg">
                Start Bidding <Kbd>Space</Kbd>
              </button>
              <button type="button" disabled={busy} onClick={onSkip} className="btn-danger min-h-[56px] text-lg">
                Skip – Unsold <Kbd>N</Kbd>
              </button>
            </div>
          </>
        ) : (
          <p className="pt-4 text-center font-display text-3xl font-bold uppercase text-accent 2xl:text-5xl">Which team will it be?</p>
        )}
        </div>
      </div>
    </div>
  );
}
