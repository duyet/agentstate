import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  unit: string;
  footnote?: React.ReactNode;
  icon: LucideIcon;
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
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
}: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      {footnote && <p className="text-xs text-muted-foreground mt-2">{footnote}</p>}
    </Card>
  );
}
