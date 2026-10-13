import { saveTeam } from "@/app/admin/actions";
import { TeamForm } from "@/components/admin/TeamForm";
import { getSports } from "@/lib/data";

export default async function NewTeamPage() {
  const sports = await getSports();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-4xl font-extrabold uppercase tracking-wide">Add team</h1>
      <TeamForm action={saveTeam.bind(null, null)} sports={sports} />
    </div>
  );
}
