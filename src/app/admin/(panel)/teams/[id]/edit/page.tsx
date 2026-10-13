import { notFound } from "next/navigation";
import { saveTeam } from "@/app/admin/actions";
import { TeamForm } from "@/components/admin/TeamForm";
import { getSports, getTeam } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export default async function EditTeamPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [team, sports] = await Promise.all([getTeam(id), getSports()]);
  if (!team) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-4xl font-extrabold uppercase tracking-wide">Edit team</h1>
      <TeamForm action={saveTeam.bind(null, team.id)} sports={sports} team={team} />
    </div>
  );
}
