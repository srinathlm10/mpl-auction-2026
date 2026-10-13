export function SkillBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-display text-lg font-bold">
          {value}
          <span className="text-xs font-normal text-muted">/{max}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
