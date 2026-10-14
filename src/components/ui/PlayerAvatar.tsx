"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, initials } from "@/lib/format";

interface Props {
  name: string;
  src: string | null;
  /** Responsive `sizes` hint so the browser downloads the smallest suitable image. */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** "cover" fills the frame (photos); "contain" shows the whole image on white (team logos). */
  fit?: "cover" | "contain";
}

/**
 * Photo (or logo) that fills its parent – the parent must be `relative` and
 * have a size. Images are lazy-loaded and optimised by next/image; without a
 * photo, or when the file is not there (yet), we show initials on the current
 * accent colour.
 */
/** The stock silhouette counts as "no photo": initials look better than an empty figure. */
const PLACEHOLDER = "/players/placeholder.svg";

export function PlayerAvatar({ name, src, sizes, priority = false, className, fit = "cover" }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  if (src && src !== PLACEHOLDER && failed !== src) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        // SVGs (like the placeholder photo) are already tiny and sharp; serve them as-is.
        unoptimized={src.endsWith(".svg")}
        onError={() => setFailed(src)}
        className={cn(fit === "contain" ? "bg-white object-contain p-[4%]" : "object-cover object-top", className)}
      />
    );
  }
  return (
    <div
      aria-label={name}
      role="img"
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-accent via-accent/80 to-primary font-display text-5xl font-extrabold text-white/95 [text-shadow:0_2px_12px_rgb(0_0_0/0.25)]",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
