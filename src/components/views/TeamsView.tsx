"use client";

import { SportTabs } from "@/components/SportTabs";
import { TeamCard } from "@/components/TeamCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { squadOf } from "@/lib/auction";
import { accentStyle, getSportConfig } from "@/lib/sports";
import { useAuctionData } from "@/lib/use-auction";

export function TeamsView() {
  const { sports, teams, players } = useAuctionData();

  return (
    <>
      <PageHeader eyebrow="Squads" title="Teams" subtitle="Every team's captain, players and remaining purse, now that the auction is complete." />
      <SportTabs sports={sports} hrefFor={(s) => `#${s.slug}`} />

      <div className="space-y-12">
        {sports.map((sport) => {
          const config = getSportConfig(sport.slug, sport.name);
          const sportTeams = teams.filter((t) => t.sport_id === sport.id);
          return (
            <section key={sport.id} id={sport.slug} style={accentStyle(config)} className="scroll-mt-24" aria-labelledby={`${sport.slug}-heading`}>
              <h2 id={`${sport.slug}-heading`} className="section-title mb-5 flex items-center gap-3">
                <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-2xl">{config.emoji}</span>
                {sport.name}
                <span className="ml-1 h-px flex-1 bg-border" aria-hidden />
              </h2>
              {sportTeams.length === 0 ? (
                <p className="card p-6 text-muted">No teams added yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {sportTeams.map((team) => (
                    <TeamCard key={team.id} team={{ ...team, players: squadOf(players, team.id) }} />
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
