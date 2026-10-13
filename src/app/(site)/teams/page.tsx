import type { Metadata } from "next";
import { SportTabs } from "@/components/SportTabs";
import { TeamCard } from "@/components/TeamCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSports, getTeamsWithPlayers } from "@/lib/data";
import { accentStyle, getSportConfig } from "@/lib/sports";

export const revalidate = 60;
export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  const [sports, teams] = await Promise.all([getSports(), getTeamsWithPlayers()]);

  return (
    <>
      <PageHeader title="Teams" subtitle="Captains, remaining purse and the players each team has bought." />
      <SportTabs sports={sports} hrefFor={(s) => `#${s.slug}`} />

      <div className="space-y-12">
        {sports.map((sport) => {
          const config = getSportConfig(sport.slug, sport.name);
          const sportTeams = teams.filter((t) => t.sport_id === sport.id);
          return (
            <section key={sport.id} id={sport.slug} style={accentStyle(config)} className="scroll-mt-24" aria-labelledby={`${sport.slug}-heading`}>
              <h2 id={`${sport.slug}-heading`} className="section-title mb-4 flex items-center gap-3">
                <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/20 text-2xl">{config.emoji}</span>
                {sport.name}
              </h2>
              {sportTeams.length === 0 ? (
                <p className="card p-6 text-muted">No teams added yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {sportTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
