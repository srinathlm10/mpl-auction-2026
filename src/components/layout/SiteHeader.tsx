import { Header, type NavItem } from "@/components/layout/Header";
import { baseSports } from "@/lib/data";
import { liveConfigured } from "@/lib/live-config";

/** The main menu, used on every page (public site, auction screens and admin). */
export function SiteHeader() {
  const items: NavItem[] = [
    { href: "/", label: "Home" },
    ...(liveConfigured ? [{ href: "/live", label: "Live Scores" }, { href: "/points-table", label: "Points Table" }] : []),
    ...baseSports.map((s) => ({ href: `/sports/${s.slug}`, label: s.name })),
    { href: "/teams", label: "Teams" },
    { href: "/auction", label: "Live Auction" },
    { href: "/auction/summary", label: "Results" },
    { href: "/about", label: "Rules" },
    ...(liveConfigured ? [{ href: "/admin/score", label: "Login" }] : []),
  ];

  return <Header items={items} />;
}
