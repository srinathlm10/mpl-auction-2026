"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/format";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/auction/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-display text-xl font-extrabold uppercase tracking-wide">MPL Admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/admin/auction" className="btn-primary hidden sm:inline-flex">Open auction control</Link>
          <Link href="/" className="btn-outline hidden sm:inline-flex">View site</Link>
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label="Admin" className="container-page -mb-px flex gap-1 overflow-x-auto">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition",
                active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
