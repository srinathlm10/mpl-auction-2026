import { AdminNav } from "@/components/admin/AdminNav";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auction admin", robots: { index: false, follow: false } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {isSupabaseConfigured ? (
        <>
          <AdminNav />
          <main className="container-page py-6 sm:py-8">{children}</main>
        </>
      ) : (
        <SetupNotice />
      )}
    </>
  );
}
