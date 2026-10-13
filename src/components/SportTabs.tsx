import Link from "next/link";
import { cn } from "@/lib/format";
import { getSportConfig } from "@/lib/sports";
import type { Sport } from "@/lib/types";

interface Props {
  sports: Sport[];
  /** Slug of the highlighted tab. */
  activeSlug?: string;
  /** Build the link for each tab. Defaults to the sport's player page. */
  hrefFor?: (sport: Sport) => string;
}

/** Horizontally scrollable tab strip for switching between sports. */
export function SportTabs({ sports, activeSlug, hrefFor = (s) => `/sports/${s.slug}` }: Props) {
  return (
    <nav aria-label="Sports" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto">
        {sports.map((sport) => {
          const config = getSportConfig(sport.slug, sport.name);
          const active = sport.slug === activeSlug;
          return (
            <li key={sport.id}>
              <Link
                href={hrefFor(sport)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "border-transparent bg-primary text-primary-foreground shadow-card"
                    : "border-border bg-surface text-foreground hover:border-primary",
                )}
              >
                <span aria-hidden>{config.emoji}</span>
                {sport.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
