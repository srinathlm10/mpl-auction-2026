import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { AuctionStage } from "@/components/auction/AuctionStage";
import { AuctionComplete } from "@/components/views/AuctionComplete";

export const metadata: Metadata = { title: "Auction complete" };

/** View-only copy of the auction for a second window / projector, for the signed-in admin (same browser). */
export default function AuctionScreenPage() {
  return (
    <AdminGate fallback={<AuctionComplete />}>
      <AuctionStage mode="display" />
    </AdminGate>
  );
}
