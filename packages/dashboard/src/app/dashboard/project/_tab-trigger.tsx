import type { LucideIcon } from "lucide-react";

interface TabTriggerProps {
  value: string;
  icon: LucideIcon;
  label: string;
  count?: number;
}

export function _TabTrigger({ value, icon: Icon, label, count }: TabTriggerProps) {
  return (
    <button
      type="button"
      className="px-5 py-2.5 text-sm inline-flex items-center gap-1.5 data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground text-muted-foreground transition-colors"
      data-value={value}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && (
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{count}</span>
      )}
    </button>
  );
}
