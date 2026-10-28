import type { Metadata } from "next";
import { LiveView } from "@/components/views/LiveView";

export const metadata: Metadata = { title: "Live scores" };

export default function LivePage() {
  return <LiveView />;
}
