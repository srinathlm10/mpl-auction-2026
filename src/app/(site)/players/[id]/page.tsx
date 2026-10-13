import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { SkillBar } from "@/components/ui/SkillBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPlayer, getSports, getTeams } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { accentStyle, getSportConfig } from "@/lib/sports";

type Props = { params: Promise<{ id: string }> };

export const revalidate = 30;

async function loadPlayer(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return undefined;
  return getPlayer(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = await loadPlayer((await params).id);
  return { title: player ? player.name : "Player not found" };
}

export default async function PlayerPage({ params }: Props) {
  const player = await loadPlayer((await params).id);
  if (!player) notFound();

  const [sports, teams] = await Promise.all([getSports(), getTeams(player.sport_id)]);
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

  return (
    <div style={accentStyle(config)}>
      <Link href={sport ? `/sports/${sport.slug}` : "/"} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-primary">
        ← Back to {sport?.name ?? "home"} players
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,340px)_1fr] md:gap-10">
        <div className="card relative aspect-[4/5] w-full max-w-sm overflow-hidden bg-border md:max-w-none">
          <PlayerAvatar
            name={player.name}
            src={player.photo_url}
            sizes="(min-width: 768px) 340px, 90vw"
            priority
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              {config.emoji} {sport?.name}
            </span>
            <StatusBadge status={player.status} />
          </div>

          <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none tracking-wide sm:text-6xl">
            {player.name}
          </h1>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label="Batch" value={player.batch || "—"} />
            <Fact label={config.roleLabel} value={player.role_or_position || "—"} />
            <Fact label="Base price" value={formatPrice(player.base_price)} />
          </dl>

          {player.status === "sold" && (
            <div className="card mt-4 border-accent/50 bg-accent/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sold to</p>
              <p className="font-display text-3xl font-bold">{team?.name ?? "Unknown team"}</p>
              <p className="text-sm text-muted">
                for <span className="font-display text-xl font-bold text-foreground">{formatPrice(player.sold_price)}</span>
              </p>
            </div>
          )}

          {skills.length > 0 && (
            <section className="mt-8" aria-labelledby="skills-heading">
              <h2 id="skills-heading" className="section-title mb-4">Key skills</h2>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-2xl font-bold">{value}</dd>
    </div>
  );
}
