import Image from "next/image";
import { cn, initials } from "@/lib/format";

interface Props {
  name: string;
  src: string | null;
  /** Responsive `sizes` hint so the browser downloads the smallest suitable image. */
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Photo (or logo) that fills its parent – the parent must be `relative` and
 * have a size. Images are lazy-loaded and optimised by next/image; without a
 * photo we show initials on the current accent colour.
 */
export function PlayerAvatar({ name, src, sizes, priority = false, className }: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-label={name}
      role="img"
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/80 to-primary/80 font-display text-5xl font-extrabold text-white",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
