import Image from "next/image";
import Link from "next/link";
import { SportCard } from "@/components/SportCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { HomeStats } from "@/components/views/HomeStats";
import { LiveNowStrip } from "@/components/views/LiveNowStrip";
import { basePlayers as players, baseSports as sports, baseTeams as teams } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { liveConfigured } from "@/lib/live-config";
import { siteConfig } from "@/lib/site";
import { getSportConfig } from "@/lib/sports";

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "spin", title: "Spin the wheel", text: "Every player goes on the wheel. Where it stops decides who is up next." },
  { icon: "gavel", title: "Captains bid", text: "Bids open at the base price and rise in ₹1 lakh steps, live on the big screen." },
  { icon: "trophy", title: "Sold!", text: "Highest bid wins the player. Purses and squads update instantly." },
];

const HERO_LINK = "btn min-h-[48px] flex-1 border border-white/25 bg-white/10 px-2 text-white hover:bg-white/20 sm:flex-none sm:px-5 sm:text-base";

export default function HomePage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-[#0b1030] text-white shadow-lift">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(85%_130%_at_0%_0%,#4338ca_0%,transparent_62%)]" />
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
              Captains build their squads in a live auction. Browse every player, track every team and follow every match
              as it happens.
            </p>
            <div className="mt-6 flex gap-2 sm:gap-2.5">
              {liveConfigured && (
                <Link href="/live" className="btn-gold min-h-[48px] flex-[1.6] whitespace-nowrap px-2 sm:flex-none sm:px-5 sm:text-base">
                  Live scores
                  <Icon name="arrowRight" className="hidden h-4 w-4 sm:block" />
                </Link>
              )}
              <Link href="#sports" className={HERO_LINK}>
                Players
              </Link>
              <Link href="/teams" className={HERO_LINK}>
                Teams
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-indigo-100/90">
              <Icon name="calendar" className="h-4 w-4 text-amber-300" />
              Auction day: {formatDate(siteConfig.auctionDate)}
            </p>
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

      {/* How it works */}
      <section aria-labelledby="how-heading">
        <p className="eyebrow text-primary">On auction day</p>
        <h2 id="how-heading" className="section-title mb-5 mt-2">How it works</h2>
        <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
          {STEPS.map((step) => (
            <li key={step.title} className="card flex gap-4 p-4 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={step.icon} className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold uppercase leading-tight sm:text-2xl">{step.title}</h3>
                <p className="mt-0.5 text-sm text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Highlights */}
      <section aria-labelledby="highlights-heading">
        <p className="eyebrow text-primary">Live numbers</p>
        <h2 id="highlights-heading" className="section-title mb-5 mt-2">At a glance</h2>
        <HomeStats />
      </section>
    </div>
  );
}
