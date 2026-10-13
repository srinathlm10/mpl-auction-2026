import { cn } from "@/lib/format";

/** MPL crest (public/logo.svg). Plain <img>: it is a tiny local SVG. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="MPL logo" width={size} height={size} className={cn("shrink-0", className)} />
  );
}
