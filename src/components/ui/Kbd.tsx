import { cn } from "@/lib/format";

/** Keyboard-shortcut label shown on the auctioneer's buttons. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.5em] items-center justify-center rounded-md border border-current/40 px-1.5 py-px font-sans text-[0.65em] font-bold normal-case tracking-normal opacity-75",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
