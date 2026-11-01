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
        { href: "/teams", label: "Teams" },
        { href: "/auction/summary", label: "Results" },
      ],
    },
    { title: "League", links: [{ href: "/about", label: "Rules" }, { href: "/about#contact", label: "Contact" }] },
  ];

  return (
    <footer className="mt-16 border-t border-border bg-surface/60 sm:mt-20">
      <div className="container-page grid gap-8 py-8 md:grid-cols-[1.4fr_1.6fr] md:py-12">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/nitr_logo.png" alt="NIT Rourkela" width={44} height={43} className="h-10 w-auto" />
            <Logo size={36} />
            <p className="font-display text-xl font-bold uppercase leading-[1.05] md:hidden">{siteConfig.name}</p>
          </div>
          <p className="mt-4 hidden font-display text-2xl font-bold uppercase leading-tight md:block">{siteConfig.name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted md:mt-1">School of Management, NIT Rourkela. Built for MBA students, by MBA students.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="caption">{col.title}</p>
              <ul className="mt-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="block py-1 font-medium text-foreground/80 transition hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <p className="container-page py-4 text-xs text-muted">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
