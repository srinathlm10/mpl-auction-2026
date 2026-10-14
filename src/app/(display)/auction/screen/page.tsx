import type { Metadata } from "next";
import { AuctionStage } from "@/components/auction/AuctionStage";

export const metadata: Metadata = { title: "Live Auction – screen" };

/** View-only copy of the auction for a second window / projector. It follows /auction live (same browser). */
export default function AuctionScreenPage() {
  return <AuctionStage mode="display" />;
}
