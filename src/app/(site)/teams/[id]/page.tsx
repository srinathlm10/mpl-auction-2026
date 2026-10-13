import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamView } from "@/components/views/TeamView";
import { baseTeams } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => baseTeams.map((t) => ({ id: String(t.id) }));

const findTeam = (rawId: string) => baseTeams.find((t) => String(t.id) === rawId);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = findTeam((await params).id);
  return { title: team ? `${team.name} squad` : "Team not found" };
}

export default async function TeamSquadPage({ params }: Props) {
  const team = findTeam((await params).id);
  if (!team) notFound();
  return <TeamView teamId={team.id} />;
}
