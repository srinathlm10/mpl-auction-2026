import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { AuctionStage } from "@/components/auction/AuctionStage";
import { AuctionComplete } from "@/components/views/AuctionComplete";

export const metadata: Metadata = { title: "Auction complete" };

/** The auction itself, for the signed-in admin. Everyone else is told it is over. */
export default function AuctionPage() {
  return (
    <AdminGate fallback={<AuctionComplete />}>
      <AuctionStage mode="admin" />
    </AdminGate>
  );
}
