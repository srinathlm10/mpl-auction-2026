import type { Metadata } from "next";
import { AuctionNotConfigured } from "@/components/auction/AuctionNotConfigured";
import { AuctionStage } from "@/components/auction/AuctionStage";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Live Auction" };

/** The auction itself: pick a sport, spin the wheel, take bids. (No login.) */
export default function AuctionPage() {
  if (!isSupabaseConfigured) return <AuctionNotConfigured />;
  return <AuctionStage mode="admin" />;
}
