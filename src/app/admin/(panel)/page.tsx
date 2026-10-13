import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { getPlayers, getSiteStats, getSports, getTeams } from "@/lib/data";

export default async function AdminDashboard() {
  const [stats, sports, players, teams] = await Promise.all([getSiteStats(), getSports(), getPlayers(), getTeams()]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Players" value={stats.players} />
        <StatCard label="Teams" value={stats.teams} />
        <StatCard label="Sold players" value={stats.sold} />
        <StatCard label="Still available" value={stats.available} hint={`${stats.unsold} unsold`} />
      </div>

      <section>
        <h2 className="section-title mb-3">By sport</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr><th className="p-3">Sport</th><th className="p-3">Players</th><th className="p-3">Sold</th><th className="p-3">Teams</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sports.map((sport) => {
                const sportPlayers = players.filter((p) => p.sport_id === sport.id);
                return (
                  <tr key={sport.id}>
                    <td className="p-3 font-semibold">{sport.name}</td>
                    <td className="p-3">{sportPlayers.length}</td>
                    <td className="p-3">{sportPlayers.filter((p) => p.status === "sold").length}</td>
                    <td className="p-3">{teams.filter((t) => t.sport_id === sport.id).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/admin/auction" className="btn-primary">Open auction control</Link>
        <Link href="/auction" target="_blank" className="btn-outline">Projector screen ↗</Link>
        <Link href="/admin/auction/settings" className="btn-outline">Auction settings</Link>
        <Link href="/auction/summary" className="btn-outline">Results &amp; CSV</Link>
      </section>
    </div>
  );
}
