import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { SkillBar } from "@/components/ui/SkillBar";
import { formatCompact, formatPrice } from "@/lib/format";
import { playerSubtitle, type SportConfig } from "@/lib/sports";
import type { Player } from "@/lib/types";

interface Props {
  player: Player;
  config: SportConfig;
  basePrice: number;
  /** Smaller layout used while bidding is open. */
  compact?: boolean;
}

/** Big card for the player the wheel picked. */
export function PlayerReveal({ player, config, basePrice, compact = false }: Props) {
  const skills = config.skills.filter((s) => player.skills[s.key] !== undefined);

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-border 2xl:h-32 2xl:w-28">
          <PlayerAvatar name={player.name} src={player.photo_url} sizes="112px" className="text-2xl" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-3xl font-extrabold uppercase leading-tight 2xl:text-5xl">{player.name}</p>
          <p className="truncate text-muted 2xl:text-xl">
            {playerSubtitle(player)}
          </p>
          <p className="text-sm text-muted 2xl:text-lg">
            Base <span className="font-bold text-foreground">{formatPrice(basePrice)}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-[reveal_0.5s_ease-out] overflow-hidden border-accent/60">
      <div className="grid gap-0 sm:grid-cols-[minmax(0,2fr)_3fr]">
        <div className="relative aspect-[4/5] w-full bg-border sm:aspect-auto sm:min-h-[22rem]">
          <PlayerAvatar name={player.name} src={player.photo_url} sizes="(min-width: 1280px) 22vw, (min-width: 640px) 35vw, 100vw" priority />
        </div>
        <div className="flex flex-col gap-4 p-5 2xl:gap-6 2xl:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-accent 2xl:text-lg">
              {config.emoji} {config.name} · On the block
            </p>
            <h2 className="mt-1 font-display text-[clamp(2.5rem,5vw,5rem)] font-extrabold uppercase leading-none">{player.name}</h2>
            <p className="mt-2 text-lg text-muted 2xl:text-2xl">
              {playerSubtitle(player, { batchPrefix: "Batch " })}
            </p>
          </div>

          {skills.length > 0 && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              {skills.map((s) => (
                <SkillBar key={s.key} label={s.label} value={player.skills[s.key]} />
              ))}
            </div>
          )}

          <div className="mt-auto rounded-2xl bg-accent/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted 2xl:text-base">Base price</p>
            <p className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-none">{formatCompact(basePrice)}</p>
            <p className="text-sm text-muted">{formatPrice(basePrice)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
