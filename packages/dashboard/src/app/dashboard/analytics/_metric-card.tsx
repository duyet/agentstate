"use client";

import { LayerCard, Text } from "@cloudflare/kumo";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  unit: string;
  footnote?: React.ReactNode;
  icon: Icon;
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
    <LayerCard className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Text variant="heading3" as="h3">
            {title}
          </Text>
          <Text variant="secondary" as="p">
            {subtitle}
          </Text>
        </div>
        <div className={cn("flex size-8 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={iconColor} aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
      </div>
    </LayerCard>
  );
}
