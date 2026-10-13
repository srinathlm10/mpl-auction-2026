import { cn } from "@/lib/format";
import type { PlayerStatus } from "@/lib/types";

const STYLES: Record<PlayerStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30" },
  sold: { label: "Sold", className: "bg-primary/15 text-primary ring-primary/30" },
  unsold: { label: "Unsold", className: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30" },
};

export function statusLabel(status: PlayerStatus) {
  return STYLES[status].label;
}

export function StatusBadge({ status, className }: { status: PlayerStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
