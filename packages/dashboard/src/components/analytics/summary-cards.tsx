import { CoinsIcon, HashIcon, KeyIcon, MessageSquareIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardsProps {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  activeApiKeys: number;
}

export function SummaryCards({
  totalConversations,
  totalMessages,
  totalTokens,
  activeApiKeys,
}: SummaryCardsProps) {
  const stats = [
    { icon: MessageSquareIcon, label: "Conversations", value: totalConversations.toLocaleString() },
    { icon: HashIcon, label: "Messages", value: totalMessages.toLocaleString() },
    { icon: CoinsIcon, label: "Tokens", value: totalTokens.toLocaleString() },
    { icon: KeyIcon, label: "API Keys", value: activeApiKeys },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
