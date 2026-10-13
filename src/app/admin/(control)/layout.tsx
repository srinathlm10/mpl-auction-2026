import { AdminGuard } from "@/components/admin/AdminGuard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auction control", robots: { index: false, follow: false } };

/** Full-width layout for the auctioneer's control screen (it has its own top bar). */
export default function ControlLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{() => children}</AdminGuard>;
}
