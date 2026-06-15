"use client";

import { ChatCentered, Hash, Key } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    { label: "Tokens", value: totalTokens.toLocaleString(), icon: Hash },
    { label: "API Keys", value: activeKeyCount.toLocaleString(), icon: Key },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label} className="flex flex-col gap-3 p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-4">
              {s.label}
            </p>
            <div className="flex items-end justify-between gap-2">
              <span className="num font-mono text-[26px] font-semibold tracking-tight text-fg tabular-nums">
                {s.value}
              </span>
              <Badge dot>
                <Icon className="size-3" aria-hidden />
                active
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
