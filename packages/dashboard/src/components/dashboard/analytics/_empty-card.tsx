import type { Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

interface EmptyCardProps {
  icon: Icon;
  message: string;
  minHeight?: string;
}

export function EmptyCard({ icon: Icon, message, minHeight = "min-h-[140px]" }: EmptyCardProps) {
  return (
    <Card
      className={`flex h-full flex-col items-center justify-center p-6 text-center ${minHeight}`}
    >
      <Icon className="mb-2 size-5 text-fg-4" aria-hidden="true" />
      <p className="text-[13px] text-fg-3">{message}</p>
    </Card>
  );
}
