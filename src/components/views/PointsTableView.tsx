"use client";

import { ConnectionNote } from "@/components/live/parts";
import { ScoreTable } from "@/components/live/ScoreTable";
import { Standings } from "@/components/live/Standings";
import { PageHeader } from "@/components/ui/PageHeader";
import { LIVE_SPORTS } from "@/lib/live";
import { useLive } from "@/lib/use-live";

export function PointsTableView() {
  const { matches, status, loaded, error, configured } = useLive();
  const played = matches.some((m) => m.status === "finished");

  return (
    <div>
      <PageHeader eyebrow="Football & Volleyball" title="Points table" subtitle="The standings and every match score, worked out from the results as they are posted." />

      {configured && loaded && !played && (
        <p className="mb-8 flex items-center gap-2 text-sm text-muted">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
          No match has finished yet. The tables fill in by themselves as results come in.
        </p>
      )}

      <div className="space-y-10 sm:space-y-12">
        {LIVE_SPORTS.map((sport) => (
          <div key={sport} className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
            <Standings matches={matches} sport={sport} />
            <ScoreTable matches={matches} sport={sport} />
          </div>
        ))}
      </div>

      {configured && (
        <div className="mt-10">
          <ConnectionNote status={status} error={error} loaded={loaded} />
        </div>
      )}
    </div>
  );
}
