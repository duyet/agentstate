"use client";

import {
  ActivityIcon,
  CircleDollarSignIcon,
  DatabaseIcon,
  KeyIcon,
  MessageCircleIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCostMicrodollars } from "@/lib/format-cost";

interface SummaryCardsProps {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCostMicrodollars?: number;
  activeApiKeys: number;
}

export function SummaryCards({
  totalConversations,
  totalMessages,
  totalTokens,
  totalCostMicrodollars,
  activeApiKeys,
}: SummaryCardsProps) {
  const stats = [
    {
      label: "Conversations",
      value: totalConversations.toLocaleString(),
      icon: MessageCircleIcon,
      trend: "active",
      footer: "Total conversation threads",
    },
    {
      label: "Messages",
      value: totalMessages.toLocaleString(),
      icon: ActivityIcon,
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
            icon: CircleDollarSignIcon,
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
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {stats.map((s) => (
        <Card key={s.label} className="@container/card">
          <CardHeader>
            <CardDescription>{s.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {s.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <s.icon className="size-3" />
                {s.trend}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {s.footer} <TrendingUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              {s.trend === "growing"
                ? "Growing steadily"
                : s.trend === "spend"
                  ? "Cost tracking"
                  : `${s.trend} count`}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
