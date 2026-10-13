import { siteConfig } from "./site";

const numberFormat = new Intl.NumberFormat("en-IN");

export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `${siteConfig.currencySymbol}${numberFormat.format(amount)}`;
}

/** Short form for big screens: ₹1 L, ₹45 L, ₹1.25 Cr. */
export function formatCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const sym = siteConfig.currencySymbol;
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (amount >= 10_000_000) return `${sym}${trim(amount / 10_000_000)} Cr`;
  if (amount >= 100_000) return `${sym}${trim(amount / 100_000)} L`;
  return `${sym}${numberFormat.format(amount)}`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
