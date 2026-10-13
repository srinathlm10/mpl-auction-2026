import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      {(user) => (
        <>
          <AdminNav email={user.email} />
          <main className="container-page py-6 sm:py-8">{children}</main>
        </>
      )}
    </AdminGuard>
  );
}
