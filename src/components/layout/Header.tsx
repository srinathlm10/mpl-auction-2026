"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/format";
import { siteConfig } from "@/lib/site";

export interface NavItem {
  href: string;
  label: string;
}

const LIVE = "/auction";

export function Header({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" || href === LIVE ? pathname === href : pathname.startsWith(href));
  const links = items.filter((item) => item.href !== LIVE);

  return (
    <header className="site-nav sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${siteConfig.shortName} home`}>
          <Image src="/nitr_logo.png" alt="NIT Rourkela" width={38} height={37} className="h-9 w-auto" priority />
          <span aria-hidden className="h-7 w-px bg-border" />
          <Logo size={34} />
          <span className="leading-none">
            <span className="block font-display text-2xl font-extrabold uppercase">{siteConfig.shortName}</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">NIT Rourkela</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 rounded-full border border-border/80 bg-surface/70 p-1 lg:flex" aria-label="Main">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                isActive(item.href) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-primary/10 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={LIVE}
            className={cn("btn-gold hidden min-h-[40px] px-3.5 sm:inline-flex", isActive(LIVE) && "ring-2 ring-gold/40 ring-offset-2 ring-offset-background")}
          >
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            Live Auction
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden" aria-label="Mobile">
          <div className="container-page grid gap-1 py-3">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold",
                  isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface",
                )}
              >
                {item.label}
                <Icon name="arrowRight" className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
