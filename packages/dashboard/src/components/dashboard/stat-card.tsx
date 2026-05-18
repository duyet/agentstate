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
    <Card size="sm" className={cn("min-h-[7rem]", className)}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon aria-hidden="true" />
          </span>
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <CardTitle className="text-2xl tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
