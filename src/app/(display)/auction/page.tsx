import type { Metadata } from "next";
import { AuctionStage } from "@/components/auction/AuctionStage";

export const metadata: Metadata = { title: "Live Auction" };

/** The auction itself: pick a sport, spin the wheel, take bids. (No login.) */
export default function AuctionPage() {
  return <AuctionStage mode="admin" />;
}
