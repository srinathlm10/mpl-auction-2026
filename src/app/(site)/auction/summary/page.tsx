import type { Metadata } from "next";
import Link from "next/link";
import { SportTabs } from "@/components/SportTabs";
import { SummaryDownload, type SummaryRow } from "@/components/SummaryDownload";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getPlayers, getSports, getTeams } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { accentStyle, getSportConfig } from "@/lib/sports";

export const revalidate = 15;
export const metadata: Metadata = { title: "Auction summary" };

type Props = { searchParams: Promise<{ sport?: string }> };

export default async function AuctionSummaryPage({ searchParams }: Props) {
  const { sport: sportSlug } = await searchParams;
  const [sports, players, teams] = await Promise.all([getSports(), getPlayers(), getTeams()]);
  const sport = sports.find((s) => s.slug === sportSlug);

  const sportName = (id: number) => sports.find((s) => s.id === id)?.name ?? "";
  const teamName = (id: number | null) => teams.find((t) => t.id === id)?.name ?? "";
  const scoped = players.filter((p) => !sport || p.sport_id === sport.id);

  const sold = scoped.filter((p) => p.status === "sold").sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0));
  const unsold = scoped.filter((p) => p.status === "unsold");
  const pending = scoped.filter((p) => p.status === "available");
  const totalSpent = sold.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);

  const csvRows: SummaryRow[] = [...sold, ...unsold].map((p) => ({
    sport: sportName(p.sport_id),
    player: p.name,
    batch: p.batch,
    role: p.role_or_position,
    status: p.status === "sold" ? "Sold" : "Unsold",
    team: teamName(p.team_id),
    basePrice: p.base_price,
    soldPrice: p.sold_price,
  }));

  const config = sport ? getSportConfig(sport.slug, sport.name) : undefined;

  return (
    <div style={config ? accentStyle(config) : undefined}>
      <PageHeader title="Auction summary" subtitle="Every sale and every unsold player, updated as the auction runs." />

      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <SportTabs sports={sports} activeSlug={sport?.slug} hrefFor={(s) => `/auction/summary?sport=${s.slug}`} />
        <SummaryDownload rows={csvRows} filename={`mpl-auction-${sport?.slug ?? "all-sports"}.csv`} />
      </div>
      {sport && <Link href="/auction/summary" className="mb-4 inline-block text-sm font-semibold text-primary hover:underline">Show all sports</Link>}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sold" value={sold.length} />
        <StatCard label="Unsold" value={unsold.length} />
        <StatCard label="Still to auction" value={pending.length} />
        <StatCard label="Total spent" value={formatPrice(totalSpent)} />
      </div>

      <section aria-labelledby="sold-heading" className="mb-10">
        <h2 id="sold-heading" className="section-title mb-3">Sold players</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-3">#</th><th className="p-3">Player</th>{!sport && <th className="p-3">Sport</th>}
                <th className="p-3">Team</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">Sold for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sold.map((p, i) => (
                <tr key={p.id}>
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3">
                    <Link href={`/players/${p.id}`} className="font-semibold hover:text-primary">{p.name}</Link>
                    <span className="block text-xs text-muted">{p.role_or_position}</span>
                  </td>
                  {!sport && <td className="p-3">{sportName(p.sport_id)}</td>}
                  <td className="p-3">{teamName(p.team_id)}</td>
                  <td className="p-3 text-right text-muted">{formatPrice(p.base_price)}</td>
                  <td className="p-3 text-right font-display text-xl font-bold">{formatPrice(p.sold_price)}</td>
                </tr>
              ))}
              {sold.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No players sold yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="unsold-heading">
        <h2 id="unsold-heading" className="section-title mb-3">Unsold players</h2>
        {unsold.length === 0 ? (
          <p className="card p-6 text-muted">No unsold players.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unsold.map((p) => (
              <li key={p.id} className="card p-3">
                <Link href={`/players/${p.id}`} className="font-semibold hover:text-primary">{p.name}</Link>
                <p className="text-xs text-muted">
                  {[!sport && sportName(p.sport_id), p.role_or_position, p.batch].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
