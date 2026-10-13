"use client";

import { Kbd } from "@/components/ui/Kbd";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { SkillBar } from "@/components/ui/SkillBar";
import { formatCompact, formatPrice } from "@/lib/format";
import type { SportConfig, WheelPool } from "@/lib/sports";
import type { Player } from "@/lib/types";

interface Props {
  player: Player;
  config: SportConfig;
  /** The wheel the player came from (cricket), if any. */
  pool?: WheelPool;
  basePrice: number;
  /** Control screen shows the Start Bidding / Skip buttons; the projector just shows the card. */
  admin: boolean;
  busy: boolean;
  onStartBidding: () => void;
  onSkip: () => void;
}

/** Pop-up card for the player the wheel just landed on. */
export function PlayerSpotlight({ player, config, pool, basePrice, admin, busy, onStartBidding, onSkip }: Props) {
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
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-name"
        className="card my-auto w-full max-w-4xl animate-[reveal_0.45s_ease-out] overflow-hidden border-2 border-accent shadow-2xl"
      >
        <div className="grid sm:grid-cols-[minmax(0,2fr)_3fr]">
          <div className="relative aspect-[4/5] w-full bg-border sm:aspect-auto sm:min-h-[26rem]">
            <PlayerAvatar name={player.name} src={player.photo_url} sizes="(min-width: 640px) 360px, 100vw" priority />
            <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-slate-900 2xl:text-sm">
              On the block
            </span>
          </div>

          <div className="flex flex-col gap-5 p-5 sm:p-7 2xl:p-10">
            <h2 id="spotlight-name" className="font-display text-[clamp(2.4rem,5vw,4.5rem)] font-extrabold uppercase leading-none">
              {player.name}
            </h2>

            <dl className="grid grid-cols-2 gap-3">
              {facts.map((f) => (
                <div key={f.label} className="rounded-xl bg-accent/10 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted 2xl:text-sm">{f.label}</dt>
                  <dd className="font-display text-xl font-bold leading-tight 2xl:text-3xl">{f.value}</dd>
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

            <div className="mt-auto flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-accent/15 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted 2xl:text-base">Base price</p>
                <p className="font-display text-5xl font-extrabold leading-none 2xl:text-7xl">{formatCompact(basePrice)}</p>
                <p className="text-sm text-muted">{formatPrice(basePrice)}</p>
              </div>
              {!admin && <p className="text-lg font-semibold text-accent 2xl:text-2xl">Bidding starts shortly…</p>}
            </div>

            {admin && (
              <div className="grid grid-cols-3 gap-3">
                <button type="button" disabled={busy} onClick={onStartBidding} className="btn-primary col-span-2 min-h-[60px] text-xl">
                  Start Bidding <Kbd>Space</Kbd>
                </button>
                <button type="button" disabled={busy} onClick={onSkip} className="btn-danger min-h-[60px]">
                  Skip → Unsold <Kbd>N</Kbd>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
