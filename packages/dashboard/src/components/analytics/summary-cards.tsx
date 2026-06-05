import {
  ActivityIcon,
  CircleDollarSignIcon,
  DatabaseIcon,
  KeyIcon,
  MessageCircleIcon,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
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
      icon: MessageCircleIcon,
      label: "Conversations",
      value: totalConversations.toLocaleString(),
    },
    { icon: ActivityIcon, label: "Messages", value: totalMessages.toLocaleString() },
    { icon: DatabaseIcon, label: "Tokens", value: totalTokens.toLocaleString() },
    ...(totalCostMicrodollars != null
      ? [
          {
            icon: CircleDollarSignIcon,
            label: "Total cost",
            value: formatCostMicrodollars(totalCostMicrodollars),
          },
        ]
      : []),
    { icon: KeyIcon, label: "API keys", value: activeApiKeys },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
      ))}
    </div>
  );
}
