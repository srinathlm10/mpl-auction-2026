"use client";

import { useState } from "react";
import { GoalBanner, useGoalAlert } from "@/components/live/GoalAlerts";
import { ConnectionNote, MatchCard, SoundToggle } from "@/components/live/parts";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/format";
import { isLive, LIVE_SPORTS, type LiveSport, type Match } from "@/lib/live";
import { sportInfo } from "@/lib/live-data";
import { useLive } from "@/lib/use-live";
import { useLiveSounds } from "@/lib/use-live-sound";

type Filter = "all" | LiveSport;

function Section({ title, hint, matches }: { title: string; hint?: string; matches: Match[] }) {
  if (matches.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="section-title">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}

export function LiveView() {
  const { matches, status, loaded, error, configured } = useLive();
  const [filter, setFilter] = useState<Filter>("all");
  const goal = useGoalAlert(matches, loaded);
  useLiveSounds(matches, loaded);

  const shown = matches.filter((m) => filter === "all" || m.sport === filter);
  const liveNow = shown.filter(isLive);
  const upcoming = shown.filter((m) => m.status === "upcoming");
  // Newest result first.
  const results = shown.filter((m) => m.status === "finished").sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
      active ? "border-transparent bg-foreground text-background shadow-card" : "border-border bg-surface text-foreground hover:border-primary/60 hover:text-primary",
    );

  return (
    <div>
      <GoalBanner alert={goal.alert} leaving={goal.leaving} burst={goal.burst} onClose={goal.dismiss} />
      <PageHeader eyebrow="Football & Volleyball" title="Live scores" subtitle="Follow every match as it happens. No login needed; open a match to share its link.">
        <SoundToggle />
      </PageHeader>

      <nav aria-label="Sport" className="-mx-4 mb-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto">
          <li>
            <button type="button" className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All matches
            </button>
          </li>
          {LIVE_SPORTS.map((sport) => {
            const { name, emoji } = sportInfo(sport);
            return (
              <li key={sport}>
                <button type="button" className={chip(filter === sport)} aria-pressed={filter === sport} onClick={() => setFilter(sport)}>
                  <span aria-hidden>{emoji}</span>
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {!configured && (
        <p className="card mb-8 p-4 text-sm text-muted sm:p-5">Live scores have not been switched on yet. The schedule is shown below, and scores will appear here once play starts.</p>
      )}

      <div className="space-y-10">
        {configured && loaded && liveNow.length === 0 && upcoming.length + results.length > 0 && (
          <p className="card p-4 text-sm text-muted sm:p-5">No match is being played right now.</p>
        )}
        <Section title="Live now" matches={liveNow} />
        <Section title="Up next" matches={upcoming} />
        <Section title="Results" matches={results} />
        {shown.length === 0 && <p className="text-muted">No matches.</p>}
      </div>

      {configured && (
        <div className="mt-10">
          <ConnectionNote status={status} error={error} loaded={loaded} />
        </div>
      )}
    </div>
  );
}
