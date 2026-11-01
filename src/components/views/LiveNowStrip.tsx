"use client";

import Link from "next/link";
import { MatchCard } from "@/components/live/parts";
import { Icon } from "@/components/ui/Icon";
import { isLive } from "@/lib/live";
import { useLive } from "@/lib/use-live";

/** On the home page: the matches being played right now, or the next three when nothing is on. */
export function LiveNowStrip() {
  // No live connection here (every visitor would hold one); it checks every 20 seconds.
  const { matches, configured } = useLive({ realtime: false });
  const live = matches.filter(isLive);
  const happening = live.length > 0;
  const shown = happening ? live : matches.filter((m) => m.status === "upcoming").slice(0, 3);
  if (!configured || shown.length === 0) return null;

  return (
    <section aria-labelledby="live-now-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          {happening ? (
            <p className="eyebrow flex items-center gap-2 !text-red-600 dark:!text-red-400">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              Happening now
            </p>
          ) : (
            <p className="eyebrow text-primary">Football & Volleyball</p>
          )}
          <h2 id="live-now-heading" className="section-title mt-2">{happening ? "Live scores" : "Up next"}</h2>
        </div>
        <Link href="/live" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary hover:underline">
          All matches <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}
