import Link from "next/link";
import { deleteTeam } from "@/app/admin/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getSports, getTeams } from "@/lib/data";
import { formatPrice } from "@/lib/format";

export default async function AdminTeamsPage() {
  const [teams, sports] = await Promise.all([getTeams(), getSports()]);
  const sportName = (id: number) => sports.find((s) => s.id === id)?.name ?? "—";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Teams</h1>
        <Link href="/admin/teams/new" className="btn-primary">+ Add team</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="p-3">Team</th><th className="p-3">Sport</th><th className="p-3">Captain</th>
              <th className="p-3">Purse left</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((t) => (
              <tr key={t.id}>
                <td className="p-3 font-semibold">{t.name}</td>
                <td className="p-3">{sportName(t.sport_id)}</td>
                <td className="p-3">{t.captain}</td>
                <td className="p-3">{formatPrice(t.remaining_purse)} <span className="text-muted">/ {formatPrice(t.total_purse)}</span></td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/teams/${t.id}/edit`} className="btn-outline min-h-[36px] px-3 py-1">Edit</Link>
                    <DeleteButton action={deleteTeam.bind(null, t.id)} itemName={t.name} />
                  </div>
                </td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted">No teams yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
