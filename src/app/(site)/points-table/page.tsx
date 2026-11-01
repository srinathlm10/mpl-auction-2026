import type { Metadata } from "next";
import { PointsTableView } from "@/components/views/PointsTableView";

export const metadata: Metadata = {
  title: "Points table",
  description: "Football and volleyball standings and match scores, updated live.",
};

export default function PointsTablePage() {
  return <PointsTableView />;
}
