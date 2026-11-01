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
        <p className="caption">{label}</p>
        {icon && <Icon name={icon} className="h-4 w-4 text-accent-strong" />}
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold leading-none sm:text-4xl", highlight && "text-accent-strong")}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
