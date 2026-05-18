import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, description, className }: StatCardProps) {
  return (
    <Card size="sm" className={cn("min-h-[6.25rem] justify-between", className)}>
      <CardHeader className="pb-0">
        <CardDescription className="flex items-center gap-2 text-xs">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
            <Icon aria-hidden="true" />
          </span>
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
