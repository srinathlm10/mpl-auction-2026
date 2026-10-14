import type { Metadata } from "next";
import { Suspense } from "react";
import { SummaryView } from "@/components/views/SummaryView";

export const metadata: Metadata = { title: "Auction summary" };

export default function AuctionSummaryPage() {
  return (
    <Suspense>
      <SummaryView />
    </Suspense>
  );
}
