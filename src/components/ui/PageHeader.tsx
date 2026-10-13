export function PageHeader({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Actions shown on the right (buttons, links). */
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] sm:text-6xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted sm:text-lg">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
