"use client";

import { Badge } from "@cloudflare/kumo/components/badge";
import type { TabsItem } from "@cloudflare/kumo/components/tabs";
import type { Icon } from "@phosphor-icons/react";

interface TabItemProps {
  value: string;
  icon: Icon;
  label: string;
  count?: number;
}

/**
 * Builds a Kumo TabsItem with an icon, label, and optional count badge.
 * The Kumo Tabs API takes a `tabs` array rather than compound triggers,
 * so the parent owns active-tab state and renders content panels itself.
 */
export function buildTabItem({ value, icon: Icon, label, count }: TabItemProps): TabsItem {
  return {
    value,
    label: (
      <span className="flex items-center justify-center gap-1.5">
        <Icon aria-hidden />
        {label}
        {count !== undefined && (
          <Badge variant="neutral" className="tabular-nums">
            {count}
          </Badge>
        )}
      </span>
    ),
  };
}
