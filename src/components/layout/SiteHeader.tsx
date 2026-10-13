import { Header, type NavItem } from "@/components/layout/Header";
import { getSports } from "@/lib/data";

/** The main menu, used on every page (public site, auction screens and admin). */
export async function SiteHeader() {
  let sports: Awaited<ReturnType<typeof getSports>> = [];
  try {
    sports = await getSports();
  } catch {
    // The menu should never take a page down; sport links just go missing.
  }

  const items: NavItem[] = [
    { href: "/", label: "Home" },
    ...sports.map((s) => ({ href: `/sports/${s.slug}`, label: s.name })),
    { href: "/teams", label: "Teams" },
    { href: "/auction", label: "Live Auction" },
    { href: "/auction/summary", label: "Results" },
    { href: "/about", label: "Rules" },
  ];

  return <Header items={items} />;
}
