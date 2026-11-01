import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Icon } from "@/components/ui/Icon";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatCard } from "@/components/ui/StatCard";
import { formatCompact } from "@/lib/format";
import { publishedAuction } from "@/lib/local-auction";
import { accentStyle, getSportConfig } from "@/lib/sports";

/** What everyone except the admin sees at /auction: the auction is over, and where to go next. */
export function AuctionComplete() {
  const { sports, players, teams } = publishedAuction;
  const sold = players.filter((p) => p.status === "sold").sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0));
  const spent = sold.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);
  const names = sports.map((s) => s.name);
  const sportList = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  const topBuys = sports.flatMap((sport) => {
    const player = sold.find((p) => p.sport_id === sport.id);
    return player ? [{ sport, player, team: teams.find((t) => t.id === player.team_id) }] : [];
  });

  return (
    <>
      <main className="container-page space-y-10 py-6 sm:space-y-12 sm:py-10">
        <section className="bg-hero rounded-3xl px-5 py-8 text-white shadow-lift sm:px-12 sm:py-12">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-100 sm:text-sm">
            <Icon name="check" className="h-4 w-4 text-amber-300" />
            Bidding closed
          </p>
          <h1 className="mt-3 font-display text-[clamp(3rem,8vw,5rem)] font-extrabold uppercase leading-[0.9]">The auction is complete</h1>
          <p className="mt-4 max-w-2xl text-indigo-100/90 sm:text-lg">
            All the bidding is done and the squads are set for {sportList}. Head to the Teams section to see every
            team&apos;s captain, players and remaining purse.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/teams" className="btn-gold min-h-[48px] px-5 text-base">
              View teams
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link href="/auction/summary" className="btn min-h-[48px] border border-white/25 bg-white/10 px-5 text-base text-white hover:bg-white/20">
              Full results
            </Link>
          </div>
        </section>

        <section aria-label="The auction in numbers" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon="gavel" label="Players sold" value={sold.length} />
          <StatCard icon="wallet" label="Total spent" value={formatCompact(spent)} />
          <StatCard icon="shield" label="Teams" value={teams.length} hint={`Across ${sports.length} sports`} />
          <StatCard icon="trophy" label="Highest bid" value={formatCompact(sold[0]?.sold_price)} hint={sold[0]?.name} />
        </section>

        <section aria-labelledby="top-buys-heading">
          <h2 id="top-buys-heading" className="section-title mb-5">Top buy in each sport</h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {topBuys.map(({ sport, player, team }) => {
              const config = getSportConfig(sport.slug, sport.name);
              return (
                <li key={sport.id} style={accentStyle(config)}>
                  <Link href={`/players/${player.id}`} className="card-link flex items-center gap-3 p-3">
                    <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-border">
                      <PlayerAvatar name={player.name} src={player.photo_url} sizes="56px" className="text-lg" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-accent-strong"><span aria-hidden>{config.emoji}</span> {sport.name}</span>
                      <span className="block truncate font-display text-xl font-bold uppercase leading-tight">{player.name}</span>
                      <span className="block truncate text-xs text-muted">{team?.name}</span>
                    </span>
                    <span className="shrink-0 font-display text-2xl font-bold">{formatCompact(player.sold_price)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold uppercase leading-tight">The action moves to the field</h2>
            <p className="mt-1 text-sm text-muted">Follow every football and volleyball match as it happens. Scores update live for everyone, with no login.</p>
          </div>
          <Link href="/live" className="btn-primary">
            Live scores
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
