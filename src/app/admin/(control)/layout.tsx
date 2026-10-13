import { SetupNotice } from "@/components/admin/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auction control", robots: { index: false, follow: false } };

/** Full-width layout for the auctioneer's control screen (it has its own top bar). */
export default function ControlLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  return children;
}
