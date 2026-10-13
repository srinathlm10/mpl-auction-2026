import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerView } from "@/components/views/PlayerView";
import { basePlayers } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => basePlayers.map((p) => ({ id: String(p.id) }));

const findPlayer = (rawId: string) => basePlayers.find((p) => String(p.id) === rawId);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = findPlayer((await params).id);
  return { title: player ? player.name : "Player not found" };
}

export default async function PlayerPage({ params }: Props) {
  const player = findPlayer((await params).id);
  if (!player) notFound();
  return <PlayerView playerId={player.id} />;
}
