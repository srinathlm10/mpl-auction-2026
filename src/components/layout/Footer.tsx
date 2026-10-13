import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="container-page flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. Built for MBA students, by MBA students.
        </p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-primary">Rules &amp; contact</Link>
          <Link href="/admin" className="hover:text-primary">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
