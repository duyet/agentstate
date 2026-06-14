import { HashIcon } from "lucide-react";

import { MetricCard } from "./_metric-card";

interface ActiveProjectsSummaryProps {
  activeApiKeys: number;
  totalMessages: number;
}

export function ActiveProjectsSummary({
  activeApiKeys,
  totalMessages,
}: ActiveProjectsSummaryProps) {
  return (
    <MetricCard
      title="Active Projects"
      subtitle="API keys with activity"
      value={activeApiKeys}
      unit={activeApiKeys === 1 ? "project" : "projects"}
      footnote={`${totalMessages.toLocaleString()} total messages`}
      icon={HashIcon}
    />
  );
}
