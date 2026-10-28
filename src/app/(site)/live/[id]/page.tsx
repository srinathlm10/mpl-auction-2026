import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveMatchView } from "@/components/views/LiveMatchView";
import { fixtures, getFixture, matchTitle } from "@/lib/live-data";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => fixtures.map((f) => ({ id: f.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fixture = getFixture((await params).id);
  return { title: fixture ? `${matchTitle(fixture)} · Live score` : "Match not found" };
}

export default async function LiveMatchPage({ params }: Props) {
  const fixture = getFixture((await params).id);
  if (!fixture) notFound();
  return <LiveMatchView id={fixture.id} />;
}
