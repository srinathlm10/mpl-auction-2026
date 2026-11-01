import { Icon, type IconName } from "@/components/ui/Icon";

/** Shown in place of a list that has nothing in it yet. */
export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-strong">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
    </div>
  );
}
