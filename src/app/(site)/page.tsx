import Image from "next/image";
import Link from "next/link";
import { SportCard } from "@/components/SportCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { HomeStats } from "@/components/views/HomeStats";
import { LiveNowStrip } from "@/components/views/LiveNowStrip";
import { basePlayers as players, baseSports as sports, baseTeams as teams } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { getSportConfig } from "@/lib/sports";

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "spin", title: "Spin the wheel", text: "Every player goes on the wheel. Where it stops decides who is up next." },
  { icon: "gavel", title: "Captains bid", text: "Bids open at the base price and rise in ₹1 lakh steps, live on the big screen." },
  { icon: "trophy", title: "Sold!", text: "Highest bid wins the player. Purses and squads update instantly." },
];

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#0c1240] text-white shadow-lift">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(80%_120%_at_0%_0%,#4338ca_0%,transparent_60%),radial-gradient(60%_90%_at_100%_100%,#7c2d12_0%,transparent_60%)] opacity-90" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />

        <div className="grid items-center gap-10 px-6 py-10 sm:px-12 sm:py-16 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-100 sm:text-sm">
              <Image src="/nitr_logo.png" alt="" width={28} height={27} className="h-7 w-auto rounded-full bg-white p-0.5" />
              School of Management, NIT Rourkela
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.75rem,7.5vw,5.25rem)] font-extrabold uppercase leading-[0.92]">
              {siteConfig.name}
            </h1>
            <p className="mt-3 font-display text-2xl font-semibold uppercase tracking-wide text-amber-300 sm:text-3xl">Player Auction</p>
            <p className="mt-5 max-w-xl text-base text-indigo-100/90 sm:text-lg">
              Captains build their squads in a live auction. Browse every player, follow every bid and track every team
              across Cricket, Volleyball and Football.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip border-white/15 bg-white/10 text-white">
                <Icon name="calendar" className="h-4 w-4 text-amber-300" />
                {formatDate(siteConfig.auctionDate)}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#sports" className="btn-gold min-h-[48px] px-5 text-base">
                Explore players
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
              <Link href="/teams" className="btn min-h-[48px] border border-white/25 bg-white/10 px-5 text-base text-white hover:bg-white/20">
                View teams
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

      {/* Matches being played right now (only shows during a match) */}
      <LiveNowStrip />

      {/* Sports */}
      <section id="sports" aria-labelledby="sports-heading" className="scroll-mt-24">
        <p className="eyebrow text-primary">Three sports, one auction</p>
        <h2 id="sports-heading" className="section-title mt-2 mb-6">Choose your game</h2>
        <div className="grid gap-5 md:grid-cols-3">
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
        <h2 id="how-heading" className="section-title mt-2 mb-6">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card relative overflow-hidden p-6">
              <span aria-hidden className="absolute bottom-0 right-3 font-display text-[6.5rem] font-extrabold leading-[0.8] text-primary/[0.07]">
                {i + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                <Icon name={step.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase">{step.title}</h3>
              <p className="relative mt-1 pr-10 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Highlights */}
      <section aria-labelledby="highlights-heading" style={{ "--accent": "var(--primary)" } as React.CSSProperties}>
        <p className="eyebrow text-primary">Live numbers</p>
        <h2 id="highlights-heading" className="section-title mt-2 mb-6">At a glance</h2>
        <HomeStats />
      </section>
    </div>
  );
}
