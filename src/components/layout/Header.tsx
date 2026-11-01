"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/format";
import { SCORER_CHANGED_EVENT, SCORER_STORAGE_KEY } from "@/lib/live-config";
import { siteConfig } from "@/lib/site";

export interface NavItem {
  href: string;
  label: string;
}

const LIVE = "/auction";
const LOGIN = "/admin/score";

export function Header({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  // Once this device is signed in as the admin, the Login button says "Admin" and the phone menu lists the auction.
  useEffect(() => {
    const check = () => {
      try {
        setSignedIn(localStorage.getItem(SCORER_STORAGE_KEY) !== null);
      } catch {
        setSignedIn(false);
      }
    };
    check();
    window.addEventListener(SCORER_CHANGED_EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(SCORER_CHANGED_EVENT, check);
      window.removeEventListener("storage", check);
    };
  }, []);

  const isActive = (href: string) => (href === "/" || href === LIVE ? pathname === href : pathname.startsWith(href));
  // The logo already goes home, Login has its own button, and the admin pages link to the auction.
  const links = items.filter((item) => item.href !== "/" && item.href !== LIVE && item.href !== LOGIN);
  const hasLogin = items.some((item) => item.href === LOGIN);
  const loginLabel = signedIn ? "Admin" : "Login";
  const menuItems = items.filter((item) => signedIn || item.href !== LIVE);

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

        <nav className="hidden items-center gap-0.5 rounded-full border border-border/80 bg-surface/70 p-1 xl:flex" aria-label="Main">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition",
                isActive(item.href) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-primary/10 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {hasLogin && (
            <Link
              href={LOGIN}
              aria-label={loginLabel}
              aria-current={isActive(LOGIN) ? "page" : undefined}
              className={cn("btn-outline min-h-[40px] px-3", isActive(LOGIN) && "border-primary/60 text-primary")}
            >
              <Icon name="user" className="h-4 w-4" />
              <span className="hidden sm:inline">{loginLabel}</span>
            </Link>
          )}
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background/95 backdrop-blur-xl xl:hidden" aria-label="Mobile">
          <div className="container-page grid gap-1 py-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold",
                  isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface",
                )}
              >
                {item.href === LOGIN ? loginLabel : item.label}
                <Icon name="arrowRight" className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
