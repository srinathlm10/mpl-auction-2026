import { notFound } from "next/navigation";
import { savePlayer } from "@/app/admin/actions";
import { PlayerForm } from "@/components/admin/PlayerForm";
import { getPlayer, getSports, getTeams } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export default async function EditPlayerPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [player, sports, teams] = await Promise.all([getPlayer(id), getSports(), getTeams()]);
  if (!player) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-4xl font-extrabold uppercase tracking-wide">Edit player</h1>
      <PlayerForm action={savePlayer.bind(null, player.id)} sports={sports} teams={teams} player={player} />
    </div>
  );
}
