import Link from "next/link";
import { deletePlayer } from "@/app/admin/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SportTabs } from "@/components/SportTabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPlayers, getSports } from "@/lib/data";
import { formatPrice } from "@/lib/format";

type Props = { searchParams: Promise<{ sport?: string }> };

export default async function AdminPlayersPage({ searchParams }: Props) {
  const { sport: sportSlug } = await searchParams;
  const sports = await getSports();
  const sport = sports.find((s) => s.slug === sportSlug);
  const players = await getPlayers(sport?.id);
  const sportName = (id: number) => sports.find((s) => s.id === id)?.name ?? "—";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Players</h1>
        <Link href="/admin/players/new" className="btn-primary">+ Add player</Link>
      </div>

      <SportTabs sports={sports} activeSlug={sport?.slug} hrefFor={(s) => `/admin/players?sport=${s.slug}`} />
      {sport && <Link href="/admin/players" className="-mt-3 mb-4 inline-block text-sm font-semibold text-primary hover:underline">Show all sports</Link>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Sport</th><th className="p-3">Batch</th>
              <th className="p-3">Role</th><th className="p-3">Base</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {players.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3">{sportName(p.sport_id)}</td>
                <td className="p-3">{p.batch}</td>
                <td className="p-3">{p.role_or_position}</td>
                <td className="p-3">{formatPrice(p.base_price)}</td>
                <td className="p-3"><StatusBadge status={p.status} /></td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/players/${p.id}/edit`} className="btn-outline min-h-[36px] px-3 py-1">Edit</Link>
                    <DeleteButton action={deletePlayer.bind(null, p.id)} itemName={p.name} />
                  </div>
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted">No players yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
