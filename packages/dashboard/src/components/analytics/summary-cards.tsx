import { CoinsIcon, DollarSignIcon, HashIcon, KeyIcon, MessageSquareIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
    { icon: MessageSquareIcon, label: "Conversations", value: totalConversations.toLocaleString() },
    { icon: HashIcon, label: "Messages", value: totalMessages.toLocaleString() },
    { icon: CoinsIcon, label: "Tokens", value: totalTokens.toLocaleString() },
    ...(totalCostMicrodollars != null
      ? [{ icon: DollarSignIcon, label: "Total Cost", value: formatCostMicrodollars(totalCostMicrodollars) }]
      : []),
    { icon: KeyIcon, label: "API Keys", value: activeApiKeys },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
