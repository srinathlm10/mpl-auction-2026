import { Footer } from "@/components/layout/Footer";
import { Header, type NavItem } from "@/components/layout/Header";
import { getSports } from "@/lib/data";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const sports = getSports();

  const items: NavItem[] = [
    { href: "/", label: "Home" },
    ...sports.map((s) => ({ href: `/sports/${s.slug}`, label: s.name })),
    { href: "/teams", label: "Teams" },
    { href: "/about", label: "Rules" },
  ];

  return (
    <>
      <Header items={items} />
      <main className="container-page py-6 sm:py-10">{children}</main>
      <Footer />
    </>
  );
}
