import { GoldenBoot } from "@/components/live/GoldenBoot";
import { LeagueTable } from "@/components/live/LeagueTable";
import type { LiveSport, Match } from "@/lib/live";

/** A sport's league table, with the Golden Boot race under the football one. */
export function Standings({ matches, sport }: { matches: Match[]; sport: LiveSport }) {
  return (
    <div className="space-y-8">
      <LeagueTable matches={matches} sport={sport} />
      {sport === "football" && <GoldenBoot matches={matches} />}
    </div>
  );
}
