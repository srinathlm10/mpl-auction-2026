import { savePlayer } from "@/app/admin/actions";
import { PlayerForm } from "@/components/admin/PlayerForm";
import { getSports, getTeams } from "@/lib/data";

export default async function NewPlayerPage() {
  const [sports, teams] = await Promise.all([getSports(), getTeams()]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-4xl font-extrabold uppercase tracking-wide">Add player</h1>
      <PlayerForm action={savePlayer.bind(null, null)} sports={sports} teams={teams} />
    </div>
  );
}
