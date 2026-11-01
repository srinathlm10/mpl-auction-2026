import Image from "next/image";
import Link from "next/link";
import { SportCard } from "@/components/SportCard";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { HomeStats } from "@/components/views/HomeStats";
import { LiveNowStrip } from "@/components/views/LiveNowStrip";
import { basePlayers as players, baseSports as sports, baseTeams as teams } from "@/lib/data";
import { liveConfigured } from "@/lib/live-config";
import { siteConfig } from "@/lib/site";
import { getSportConfig } from "@/lib/sports";

const HERO_LINK = "btn min-h-[48px] flex-1 border border-white/25 bg-white/10 px-2 text-white hover:bg-white/20 sm:flex-none sm:px-5 sm:text-base";

export default function HomePage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="bg-hero relative isolate overflow-hidden rounded-3xl text-white shadow-lift">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />

        <div className="grid items-center gap-10 px-5 py-8 sm:px-12 sm:py-12 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-100 sm:text-sm">
              <Image src="/nitr_logo.png" alt="" width={28} height={27} className="h-7 w-auto rounded-full bg-white p-0.5" />
              School of Management, NIT Rourkela
            </p>
            <h1 className="mt-4 font-display text-[clamp(3rem,8vw,5rem)] font-extrabold uppercase leading-[0.9]">
              {siteConfig.name}
            </h1>
            <p className="mt-3 font-display text-2xl font-semibold uppercase tracking-wide text-amber-300 sm:text-3xl">
              {sports.map((s) => s.name).join(" · ")}
            </p>
            <p className="mt-4 max-w-xl text-indigo-100/90 sm:text-lg">
              The auction is complete and the squads are set. Browse every player, check every team and follow every
              match as it happens.
            </p>
            <div className="mt-6 flex gap-2 sm:gap-2.5">
              {liveConfigured && (
                <Link href="/live" className="btn-gold min-h-[48px] flex-[1.6] whitespace-nowrap px-2 sm:flex-none sm:px-5 sm:text-base">
                  Live scores
                  <Icon name="arrowRight" className="hidden h-4 w-4 sm:block" />
                </Link>
              )}
              <Link href="/teams" className={HERO_LINK}>
                Teams
              </Link>
              <Link href="#sports" className={HERO_LINK}>
                Players
              </Link>
            </div>
          </div>

          <div className="relative mx-auto hidden aspect-square w-full max-w-[340px] lg:block" aria-hidden>
            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute inset-6 rounded-full border border-white/15" />
            <div className="absolute inset-14 rounded-full border border-dashed border-white/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Logo size={220} className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Matches being played right now, or the next ones */}
      <LiveNowStrip />

      {/* The auction is over */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="max-w-xl">
          <p className="eyebrow text-primary">Bidding closed</p>
          <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-tight">The auction is complete</h2>
          <p className="mt-1 text-sm text-muted">Every squad is set. See each team&apos;s captain and players, and who went for how much.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/teams" className="btn-primary">
            View teams
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
          <Link href="/auction/summary" className="btn-outline">Full results</Link>
        </div>
      </section>

      {/* Sports */}
      <section id="sports" aria-labelledby="sports-heading" className="scroll-mt-24">
        <p className="eyebrow text-primary">Three sports, one auction</p>
        <h2 id="sports-heading" className="section-title mb-5 mt-2">Choose your game</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {sports.map((sport) => (
            <SportCard
              key={sport.id}
              config={getSportConfig(sport.slug, sport.name)}
              playerCount={players.filter((p) => p.sport_id === sport.id).length}
              teamCount={teams.filter((t) => t.sport_id === sport.id).length}
            />
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section aria-labelledby="highlights-heading">
        <p className="eyebrow text-primary">The league in numbers</p>
        <h2 id="highlights-heading" className="section-title mb-5 mt-2">At a glance</h2>
        <HomeStats />
      </section>
    </div>
  );
}
