import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
        <CardAction>
          <div className={cn("flex size-8 items-center justify-center rounded-lg", iconBg)}>
            <Icon className={iconColor} aria-hidden="true" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}
