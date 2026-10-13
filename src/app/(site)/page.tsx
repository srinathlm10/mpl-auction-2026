import Image from "next/image";
import Link from "next/link";
import { SportCard } from "@/components/SportCard";
import { Logo } from "@/components/ui/Logo";
import { StatCard } from "@/components/ui/StatCard";
import { getPlayers, getSiteStats, getSports, getTeams } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { getSportConfig } from "@/lib/sports";

export const revalidate = 30;

export default async function HomePage() {
  const [sports, players, teams, stats] = await Promise.all([getSports(), getPlayers(), getTeams(), getSiteStats()]);

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-800 to-slate-950 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div aria-hidden className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-10">
          <Logo size={112} className="drop-shadow-xl" />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-100">
              <Image src="/nitr_logo.png" alt="" width={28} height={27} className="h-7 w-auto rounded-full bg-white p-0.5" />
              NIT Rourkela presents
            </p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Player Auction</p>
            <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-none tracking-wide sm:text-7xl">
              {siteConfig.name}
            </h1>
            <p className="mt-4 max-w-xl text-base text-indigo-100 sm:text-lg">
              The MBA sports festival where captains build their squads in a live auction. Browse every player,
              track every team and follow the action across Cricket, Volleyball and Football.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#sports" className="btn bg-amber-400 text-slate-900 hover:bg-amber-300">Explore players</Link>
              <Link href="/teams" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20">View teams</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sports */}
      <section id="sports" aria-labelledby="sports-heading" className="scroll-mt-24">
        <h2 id="sports-heading" className="section-title mb-5">Choose your game</h2>
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
        <h2 id="highlights-heading" className="section-title mb-5">Highlights</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total players" value={stats.players} hint={`${stats.sold} sold so far`} />
          <StatCard label="Total teams" value={stats.teams} hint={`${sports.length} sports`} />
          <StatCard label="Players available" value={stats.available} />
          <StatCard label="Auction date" value={formatDate(siteConfig.auctionDate)} />
        </div>
      </section>
    </div>
  );
}
