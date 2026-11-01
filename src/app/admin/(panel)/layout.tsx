import { AdminGate } from "@/components/admin/AdminGate";
import { AdminNav } from "@/components/admin/AdminNav";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <AdminGate>
        <AdminNav />
        <main className="container-page py-6 sm:py-8">{children}</main>
      </AdminGate>
    </>
  );
}
