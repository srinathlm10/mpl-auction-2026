import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { baseSports } from "@/lib/data";
import { siteConfig } from "@/lib/site";

export function Footer() {
  const columns = [
    { title: "Sports", links: baseSports.map((s) => ({ href: `/sports/${s.slug}`, label: s.name })) },
    {
      title: "Auction",
      links: [
        { href: "/auction", label: "Live auction" },
        { href: "/auction/summary", label: "Results" },
        { href: "/teams", label: "Teams" },
      ],
    },
    { title: "League", links: [{ href: "/about", label: "Rules" }, { href: "/about#contact", label: "Contact" }] },
  ];

  return (
    <footer className="mt-20 border-t border-border bg-surface/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/nitr_logo.png" alt="NIT Rourkela" width={44} height={43} className="h-11 w-auto" />
            <Logo size={40} />
          </div>
          <p className="mt-4 font-display text-2xl font-bold uppercase leading-tight">{siteConfig.name}</p>
          <p className="mt-1 max-w-xs text-sm text-muted">School of Management, NIT Rourkela. Built for MBA students, by MBA students.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-medium text-foreground/80 transition hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="container-page py-5 text-xs text-muted">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
