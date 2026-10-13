import { cn } from "@/lib/format";
import type { PlayerStatus } from "@/lib/types";

const STYLES: Record<PlayerStatus, { label: string; className: string; dot: string }> = {
  available: { label: "Available", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30", dot: "bg-emerald-500" },
  sold: { label: "Sold", className: "bg-primary/15 text-primary ring-primary/30", dot: "bg-primary" },
  unsold: { label: "Unsold", className: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30", dot: "bg-slate-400" },
};

export function statusLabel(status: PlayerStatus) {
  return STYLES[status].label;
}

export function StatusBadge({ status, className }: { status: PlayerStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset",
        style.className,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
