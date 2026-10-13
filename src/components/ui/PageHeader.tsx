export function PageHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      {eyebrow && <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>}
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
    </div>
  );
}
