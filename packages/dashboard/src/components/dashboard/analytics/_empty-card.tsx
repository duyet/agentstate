import { LayerCard } from "@cloudflare/kumo";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface EmptyCardProps {
  icon: Icon;
  message: string;
  minHeight?: string;
}

export function EmptyCard({ icon: Icon, message, minHeight = "min-h-[140px]" }: EmptyCardProps) {
  return (
    <LayerCard
      className={cn("flex flex-col items-center justify-center p-6 text-center", minHeight)}
    >
      <Icon className="h-6 w-6 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </LayerCard>
  );
}
