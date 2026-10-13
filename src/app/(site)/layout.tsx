import { Footer } from "@/components/layout/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const revalidate = 30;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-6 sm:py-10">{children}</main>
      <Footer />
    </>
  );
}
