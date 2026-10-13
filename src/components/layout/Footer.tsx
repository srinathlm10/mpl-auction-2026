import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="container-page flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/nitr_logo.png" alt="NIT Rourkela" width={40} height={39} className="h-10 w-auto" />
          <p>
            © {new Date().getFullYear()} {siteConfig.name}, NIT Rourkela. Built for MBA students, by MBA students.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-primary">Rules &amp; contact</Link>
        </div>
      </div>
    </footer>
  );
}
