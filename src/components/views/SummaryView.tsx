"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SportTabs } from "@/components/SportTabs";
import { SummaryDownload, type SummaryRow } from "@/components/SummaryDownload";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { StatCard } from "@/components/ui/StatCard";
import { formatCompact, formatPrice } from "@/lib/format";
import { accentStyle, getSportConfig } from "@/lib/sports";
import { useAuctionData } from "@/lib/use-auction";

export function SummaryView() {
  const sportSlug = useSearchParams().get("sport");
  const { sports, players, teams } = useAuctionData();
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
    details: Object.values(p.attributes ?? {}).filter(Boolean).join(", "),
    status: p.status === "sold" ? "Sold" : "Unsold",
    team: teamName(p.team_id),
    basePrice: p.base_price,
    soldPrice: p.sold_price,
  }));

  const config = sport ? getSportConfig(sport.slug, sport.name) : undefined;

  const teamOf = (id: number | null) => teams.find((t) => t.id === id);

  return (
    <div style={config ? accentStyle(config) : undefined}>
      <PageHeader eyebrow="Results" title="Auction summary" subtitle="Every sale and every unsold player, updated as the auction runs.">
        <SummaryDownload rows={csvRows} filename={`mpl-auction-${sport?.slug ?? "all-sports"}.csv`} />
      </PageHeader>

      <SportTabs sports={sports} activeSlug={sport?.slug} hrefFor={(s) => `/auction/summary?sport=${s.slug}`} allHref="/auction/summary" />

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="check" label="Sold" value={sold.length} />
        <StatCard icon="close" label="Unsold" value={unsold.length} />
        <StatCard icon="spin" label="Still to auction" value={pending.length} />
        <StatCard icon="wallet" label="Total spent" value={formatCompact(totalSpent)} highlight />
      </div>

      <section aria-labelledby="sold-heading" className="mb-12">
        <h2 id="sold-heading" className="section-title mb-4">Sold players</h2>
        {sold.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-muted">
            <Icon name="gavel" className="h-8 w-8" />
            No players sold yet. Sales appear here as the auction runs.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-background/60 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Player</th>
                  {!sport && <th className="px-4 py-3">Sport</th>}
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">Sold for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sold.map((p, i) => {
                  const team = teamOf(p.team_id);
                  return (
                    <tr key={p.id} className="transition hover:bg-primary/[0.04]">
                      <td className="px-4 py-3 font-display text-lg font-bold text-muted">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/players/${p.id}`} className="flex items-center gap-3 hover:text-primary">
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-border">
                            <PlayerAvatar name={p.name} src={p.photo_url} sizes="40px" className="text-sm" />
                          </span>
                          <span>
                            <span className="block font-semibold">{p.name}</span>
                            <span className="block text-xs text-muted">{p.role_or_position}</span>
                          </span>
                        </Link>
                      </td>
                      {!sport && <td className="px-4 py-3">{sportName(p.sport_id)}</td>}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-medium">
                          {team?.logo_url && (
                            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-border">
                              <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="28px" />
                            </span>
                          )}
                          {teamName(p.team_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted">{formatCompact(p.base_price)}</td>
                      <td className="px-4 py-3 text-right font-display text-2xl font-bold" title={formatPrice(p.sold_price)}>
                        {formatCompact(p.sold_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="unsold-heading">
        <h2 id="unsold-heading" className="section-title mb-4">Unsold players</h2>
        {unsold.length === 0 ? (
          <p className="card p-6 text-muted">No unsold players.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unsold.map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className="card-link flex items-center gap-3 p-3">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-border">
                    <PlayerAvatar name={p.name} src={p.photo_url} sizes="40px" className="text-sm" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {[!sport && sportName(p.sport_id), p.role_or_position, p.batch].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
