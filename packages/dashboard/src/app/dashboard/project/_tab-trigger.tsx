import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabsTrigger } from "@/components/ui/tabs";

interface TabTriggerProps {
  value: string;
  icon: LucideIcon;
  label: string;
  count?: number;
}

export function _TabTrigger({ value, icon: Icon, label, count }: TabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className="h-10 justify-start rounded-lg px-3 data-active:bg-card data-active:shadow-sm data-active:ring-1 data-active:ring-border"
    >
      <Icon aria-hidden="true" />
      {label}
      {count !== undefined && (
        <Badge className="ml-auto rounded-md px-1.5 tabular-nums" variant="secondary">
          {count}
        </Badge>
      )}
    </TabsTrigger>
  );
}
