"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ChartLineUpIcon,
  ChatCircleIcon,
  CoinIcon,
  DatabaseIcon,
  KeyIcon,
  PulseIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCostMicrodollars } from "@/lib/format-cost";

interface SummaryCardsProps {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCostMicrodollars?: number;
  activeApiKeys: number;
}

interface Stat {
  label: string;
  value: string;
  icon: Icon;
  trend: string;
  footer: string;
}

export function SummaryCards({
  totalConversations,
  totalMessages,
  totalTokens,
  totalCostMicrodollars,
  activeApiKeys,
}: SummaryCardsProps) {
  const stats: Stat[] = [
    {
      label: "Conversations",
      value: totalConversations.toLocaleString(),
      icon: ChatCircleIcon,
      trend: "active",
      footer: "Total conversation threads",
    },
    {
      label: "Messages",
      value: totalMessages.toLocaleString(),
      icon: PulseIcon,
      trend: "growing",
      footer: "Messages exchanged",
    },
    {
      label: "Tokens",
      value: totalTokens.toLocaleString(),
      icon: DatabaseIcon,
      trend: "usage",
      footer: "Total tokens processed",
    },
    ...(totalCostMicrodollars != null
      ? [
          {
            label: "Total cost",
            value: formatCostMicrodollars(totalCostMicrodollars),
            icon: CoinIcon,
            trend: "spend",
            footer: "Accumulated API costs",
          },
        ]
      : []),
    {
      label: "API keys",
      value: activeApiKeys.toLocaleString(),
      icon: KeyIcon,
      trend: "active",
      footer: "Active keys",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {stats.map((s) => {
        const IconComp = s.icon;
        return (
          <Card key={s.label} className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4">
                  {s.label}
                </p>
                <p className="num text-[26px] font-semibold text-fg">{s.value}</p>
              </div>
              <Badge tone="default">
                <IconComp size={12} aria-hidden="true" />
                {s.trend}
              </Badge>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[13px] font-medium text-fg-2">
                <span className="line-clamp-1">{s.footer}</span>
                <ChartLineUpIcon size={16} aria-hidden="true" />
              </div>
              <p className="text-[12px] text-fg-3">
                {s.trend === "growing"
                  ? "Growing steadily"
                  : s.trend === "spend"
                    ? "Cost tracking"
                    : `${s.trend} count`}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
