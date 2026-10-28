"use client";

import Link from "next/link";
import { MatchCard } from "@/components/live/parts";
import { Icon } from "@/components/ui/Icon";
import { isLive } from "@/lib/live";
import { useLive } from "@/lib/use-live";

/** On the home page: shows the matches being played right now, and nothing at all when there are none. */
export function LiveNowStrip() {
  // No live connection here (every visitor would hold one); it checks every 20 seconds.
  const { matches, configured } = useLive({ realtime: false });
  const live = matches.filter(isLive);
  if (!configured || live.length === 0) return null;

  return (
    <section aria-labelledby="live-now-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2 !text-red-600 dark:!text-red-400">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            Happening now
          </p>
          <h2 id="live-now-heading" className="section-title mt-2">Live scores</h2>
        </div>
        <Link href="/live" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          All matches <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {live.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}
