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
    <TabsTrigger value={value} className="px-4">
      <Icon aria-hidden="true" />
      {label}
      {count !== undefined && <Badge variant="secondary">{count}</Badge>}
    </TabsTrigger>
  );
}
