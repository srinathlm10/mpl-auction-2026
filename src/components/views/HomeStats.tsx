"use client";

import { StatCard } from "@/components/ui/StatCard";
import { fixtures } from "@/lib/live-data";
import { useAuctionData } from "@/lib/use-auction";

export function HomeStats() {
  const { sports, players, teams } = useAuctionData();
  const count = (status: string) => players.filter((p) => p.status === status).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard icon="users" label="Players" value={players.length} hint={`${count("sold")} sold so far`} />
      <StatCard icon="shield" label="Teams" value={teams.length} hint={`Across ${sports.length} sports`} />
      <StatCard icon="tag" label="Still available" value={count("available")} hint={`${count("unsold")} unsold`} />
      <StatCard icon="calendar" label="Matches" value={fixtures.length} hint="Football & Volleyball" />
    </div>
  );
}
