import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/format";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: IconName;
  /** Colour the value with the page accent. */
  highlight?: boolean;
}

export function StatCard({ label, value, hint, icon, highlight }: Props) {
  return (
    <div className="card relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted sm:text-xs">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={cn("mt-1.5 font-display text-3xl font-bold leading-none sm:text-4xl", highlight && "text-accent")}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
