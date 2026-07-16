import type { Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  unit: string;
  footnote?: React.ReactNode;
  icon: Icon;
  iconBg?: string;
  iconColor?: string;
}

export function MetricCard({
  title,
  subtitle,
  value,
  unit,
  footnote,
  icon: Icon,
  iconBg = "bg-accent/10",
  iconColor = "text-accent",
}: MetricCardProps) {
  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-[14px] font-medium text-fg">{title}</h3>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4">{subtitle}</p>
        </div>
        <div
          className={`flex size-8 items-center justify-center rounded-[var(--radius)] ${iconBg}`}
        >
          <Icon className={iconColor} aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="num text-[28px] font-semibold text-fg">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          <span className="text-[13px] text-fg-3">{unit}</span>
        </div>
        {footnote && <p className="text-[12px] text-fg-3">{footnote}</p>}
      </div>
    </Card>
  );
}
