"use client";

import { Badge } from "@cloudflare/kumo/components/badge";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";
import { ChartLineUp, ChatCentered, Coins, Hash, Key } from "@phosphor-icons/react";

interface StatsGridProps {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  activeKeyCount: number;
}

export function _StatsGrid({
  totalConversations,
  totalMessages,
  totalTokens,
  activeKeyCount,
}: StatsGridProps) {
  const stats = [
    { label: "Conversations", value: totalConversations.toLocaleString(), icon: ChatCentered },
    { label: "Messages", value: totalMessages.toLocaleString(), icon: Hash },
    { label: "Tokens", value: totalTokens.toLocaleString(), icon: Coins },
    { label: "API Keys", value: activeKeyCount.toLocaleString(), icon: Key },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {stats.map((s) => (
        <LayerCard key={s.label} className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <Text variant="secondary" size="sm" as="p">
                {s.label}
              </Text>
              <Text variant="heading2" as="h2">
                {s.value}
              </Text>
            </div>
            <Badge variant="outline">
              <s.icon className="size-3" aria-hidden />
              active
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Project stats</span>
            <ChartLineUp className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <Text variant="secondary" size="xs" as="p">
            {s.label.toLowerCase()} count
          </Text>
        </LayerCard>
      ))}
    </div>
  );
}
