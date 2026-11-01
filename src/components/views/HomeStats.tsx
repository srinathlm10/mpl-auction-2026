"use client";

import { StatCard } from "@/components/ui/StatCard";
import { formatCompact } from "@/lib/format";
import { fixtures } from "@/lib/live-data";
import { useAuctionData } from "@/lib/use-auction";

export function HomeStats() {
  const { sports, players, teams } = useAuctionData();
  const sold = players.filter((p) => p.status === "sold");
  const spent = sold.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard icon="users" label="Players sold" value={sold.length} hint={`Worth ${formatCompact(spent)}`} />
      <StatCard icon="shield" label="Teams" value={teams.length} hint={`Across ${sports.length} sports`} />
      <StatCard icon="tag" label="Players" value={players.length} hint="In all three sports" />
      <StatCard icon="calendar" label="Matches" value={fixtures.length} hint="Football & Volleyball" />
    </div>
  );
}
