import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyCardProps {
  icon: LucideIcon;
  message: string;
  minHeight?: string;
}

export function EmptyCard({ icon: Icon, message, minHeight = "min-h-[140px]" }: EmptyCardProps) {
  return (
    <Card
      className={cn(
        "p-6 flex flex-col items-center justify-center text-center border-dashed",
        minHeight,
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}
