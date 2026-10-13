import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SportView } from "@/components/views/SportView";
import { baseSports, getSportBySlug } from "@/lib/data";

type Props = { params: Promise<{ sport: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => baseSports.map((s) => ({ sport: s.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sport = getSportBySlug((await params).sport);
  return { title: sport ? `${sport.name} players` : "Sport not found" };
}

export default async function SportPage({ params }: Props) {
  const sport = getSportBySlug((await params).sport);
  if (!sport) notFound();
  return <SportView slug={sport.slug} />;
}
