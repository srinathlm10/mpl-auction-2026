"use client";

import { StatCard } from "@/components/ui/StatCard";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { useAuctionData } from "@/lib/use-auction";

export function HomeStats() {
  const { sports, players, teams } = useAuctionData();
  const count = (status: string) => players.filter((p) => p.status === status).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Total players" value={players.length} hint={`${count("sold")} sold so far`} />
      <StatCard label="Total teams" value={teams.length} hint={`${sports.length} sports`} />
      <StatCard label="Players available" value={count("available")} />
      <StatCard label="Auction date" value={formatDate(siteConfig.auctionDate)} />
    </div>
  );
}
